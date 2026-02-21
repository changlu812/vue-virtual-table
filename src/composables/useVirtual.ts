import {
  ref,
  onMounted,
  onUnmounted,
  computed,
  watch,
  nextTick,
  type Ref,
  type ComputedRef,
} from "vue";
import { throttle } from "../utils";

interface UseVirtualOptions {
  containerRef: Ref<HTMLElement | null>;
  data: Ref<any[]>;
  rowHeight: number;
  containerHeight: number | Ref<number> | ComputedRef<number>;
  bufferSize?: number;
}

export function useVirtual({
  containerRef,
  data,
  rowHeight,
  containerHeight,
  bufferSize = 5,
}: UseVirtualOptions) {
  const startIndex = ref(0);
  const endIndex = ref(0);
  const offsetTop = ref(0);
  const visibleData = ref<any[]>([]);

  const totalHeight = computed(() => data.value.length * rowHeight);

  // 获取容器高度（支持响应式和静态值）
  const getContainerHeight = () => {
    if (typeof containerHeight === "number") {
      return containerHeight;
    }
    return containerHeight.value;
  };

  const calculateVisibleRange = () => {
    const currentContainerHeight = getContainerHeight();

    // 如果没有容器引用，使用传入的容器高度计算
    const scrollTop = containerRef.value?.scrollTop || 0;

    // 计算可见区域起始索引（包含缓冲区）
    const newStartIndex = Math.max(
      0,
      Math.floor(scrollTop / rowHeight) - bufferSize,
    );

    // 计算可见区域结束索引（包含缓冲区）
    const newEndIndex = Math.min(
      data.value.length,
      Math.ceil((scrollTop + currentContainerHeight) / rowHeight) + bufferSize,
    );

    // 计算偏移量
    const newOffsetTop = newStartIndex * rowHeight;

    // 更新状态
    startIndex.value = newStartIndex;
    endIndex.value = newEndIndex;
    visibleData.value = data.value.slice(newStartIndex, newEndIndex);
    offsetTop.value = newOffsetTop;
  };

  // 滚动事件处理（节流）
  const handleScroll = throttle(calculateVisibleRange, 16);

  // 滚动到指定行
  const scrollTo = (index: number) => {
    if (!containerRef.value) return;
    containerRef.value.scrollTop = index * rowHeight;
    calculateVisibleRange();
  };

  // 刷新方法
  const refresh = () => {
    nextTick(() => {
      calculateVisibleRange();
    });
  };

  // 监听数据变化
  watch(
    () => data.value.length,
    () => {
      nextTick(() => {
        calculateVisibleRange();
      });
    },
    { immediate: true },
  );

  // 监听容器高度变化（如果是响应式的）
  if (typeof containerHeight !== "number") {
    watch(
      () =>
        typeof containerHeight === "number"
          ? containerHeight
          : containerHeight.value,
      () => {
        nextTick(() => {
          calculateVisibleRange();
        });
      },
    );
  }

  // 生命周期钩子
  onMounted(() => {
    nextTick(() => {
      calculateVisibleRange();
      if (containerRef.value) {
        containerRef.value.addEventListener("scroll", handleScroll, {
          passive: true,
        });
      }
    });
  });

  onUnmounted(() => {
    containerRef.value?.removeEventListener("scroll", handleScroll);
  });

  return {
    visibleData,
    startIndex,
    endIndex,
    offsetTop,
    totalHeight,
    scrollTo,
    refresh,
  };
}
