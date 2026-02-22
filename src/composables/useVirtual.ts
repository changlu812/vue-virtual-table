import {
  ref,
  shallowRef,
  onMounted,
  onUnmounted,
  computed,
  watch,
  nextTick,
  type Ref,
  type ComputedRef,
} from 'vue';
import { throttle } from '../utils/debounce-throttle';
import type { RowData } from '../types';

// Keep scrollable height below browser pixel limits (~16.7M in many engines).
const MAX_SCROLL_HEIGHT = 16_000_000;

interface UseVirtualOptions<T extends RowData> {
  containerRef: Ref<HTMLElement | null>;
  data: Readonly<Ref<T[]>>;
  rowHeight: number;
  containerHeight: number | Ref<number> | ComputedRef<number>;
  bufferSize?: number;
}

export function useVirtual<T extends RowData>({
  containerRef,
  data,
  rowHeight,
  containerHeight,
  bufferSize = 5,
}: UseVirtualOptions<T>) {
  const startIndex = ref(0);
  const endIndex = ref(0);
  const offsetTop = ref(0);
  const visibleData = shallowRef<T[]>([]);

  const logicalTotalHeight = computed(() => data.value.length * rowHeight);
  const totalHeight = computed(() => Math.min(logicalTotalHeight.value, MAX_SCROLL_HEIGHT));

  // 获取容器高度（支持响应式和静态值）
  const getContainerHeight = () => {
    if (typeof containerHeight === 'number') {
      return containerHeight;
    }
    return containerHeight.value;
  };

  const getScrollBounds = (currentContainerHeight: number) => {
    const logicalMaxScrollTop = Math.max(0, logicalTotalHeight.value - currentContainerHeight);
    const physicalMaxScrollTop = Math.max(0, totalHeight.value - currentContainerHeight);
    return { logicalMaxScrollTop, physicalMaxScrollTop };
  };

  const physicalToLogicalScrollTop = (
    physicalScrollTop: number,
    currentContainerHeight: number,
  ) => {
    const { logicalMaxScrollTop, physicalMaxScrollTop } = getScrollBounds(currentContainerHeight);
    if (logicalMaxScrollTop === 0 || physicalMaxScrollTop === 0) {
      return 0;
    }
    return (physicalScrollTop / physicalMaxScrollTop) * logicalMaxScrollTop;
  };

  const logicalToPhysicalScrollTop = (logicalScrollTop: number, currentContainerHeight: number) => {
    const { logicalMaxScrollTop, physicalMaxScrollTop } = getScrollBounds(currentContainerHeight);
    if (logicalMaxScrollTop === 0 || physicalMaxScrollTop === 0) {
      return logicalScrollTop;
    }
    const clampedLogicalScrollTop = Math.min(Math.max(logicalScrollTop, 0), logicalMaxScrollTop);
    return (clampedLogicalScrollTop / logicalMaxScrollTop) * physicalMaxScrollTop;
  };

  const calculateVisibleRange = () => {
    const currentContainerHeight = getContainerHeight();

    // Physical scrollTop may be compressed for very large lists.
    const physicalScrollTop = containerRef.value?.scrollTop || 0;
    const logicalScrollTop = physicalToLogicalScrollTop(physicalScrollTop, currentContainerHeight);
    const { logicalMaxScrollTop, physicalMaxScrollTop } = getScrollBounds(currentContainerHeight);
    const scrollScale =
      logicalMaxScrollTop > 0 && physicalMaxScrollTop > 0
        ? logicalMaxScrollTop / physicalMaxScrollTop
        : 1;
    const logicalViewportHeight = currentContainerHeight * scrollScale;

    // 计算可见区域起始索引（包含缓冲区）
    const newStartIndex = Math.max(0, Math.floor(logicalScrollTop / rowHeight) - bufferSize);

    // 计算可见区域结束索引（包含缓冲区）
    const newEndIndex = Math.min(
      data.value.length,
      Math.ceil((logicalScrollTop + logicalViewportHeight) / rowHeight) + bufferSize,
    );

    // 计算偏移量
    const logicalOffsetTop = newStartIndex * rowHeight;
    const newOffsetTop = logicalToPhysicalScrollTop(logicalOffsetTop, currentContainerHeight);

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
    const currentContainerHeight = getContainerHeight();
    const logicalScrollTop = index * rowHeight;
    containerRef.value.scrollTop = logicalToPhysicalScrollTop(
      logicalScrollTop,
      currentContainerHeight,
    );
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
  if (typeof containerHeight !== 'number') {
    watch(
      () => (typeof containerHeight === 'number' ? containerHeight : containerHeight.value),
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
        containerRef.value.addEventListener('scroll', handleScroll, {
          passive: true,
        });
      }
    });
  });

  onUnmounted(() => {
    containerRef.value?.removeEventListener('scroll', handleScroll);
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
