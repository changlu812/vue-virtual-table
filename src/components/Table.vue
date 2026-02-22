<template>
  <div class="virtual-table" :style="tableStyle">
    <!-- 表头 -->
    <div class="table-header" :style="{ paddingRight: `${scrollbarWidth}px` }">
      <div
        v-for="column in columns"
        :key="column.key"
        class="header-cell"
        :style="getColumnStyle(column)"
      >
        {{ column.title }}
      </div>
    </div>

    <!-- 表体 -->
    <div ref="containerRef" class="table-body" :style="{ height: containerHeight + 'px' }">
      <!-- 占位元素 -->
      <div class="placeholder" :style="{ height: totalHeight + 'px' }"></div>

      <!-- 可见区域数据 -->
      <div class="visible-data" :style="{ transform: `translateY(${offsetTop}px)` }">
        <TableRow
          v-for="(row, index) in visibleData"
          :key="getRowKey(row, startIndex + index)"
          :row="row"
          :columns="columns"
          :index="startIndex + index"
          @click="handleRowClick"
        />
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading">加载中...</div>
    </div>
  </div>
</template>

<script lang="ts" setup generic="T extends RowData">
import { ref, computed, toRef, watch, nextTick, onMounted, onUnmounted } from 'vue';
import TableRow from './TableRow.vue';
import { useVirtual } from '../composables/useVirtual';
import type { ColumnConfig, RowData, TableProps } from '../types';

// 定义容器 ref
const containerRef = ref<HTMLElement | null>(null);

const props = withDefaults(defineProps<TableProps<T>>(), {
  rowHeight: 36,
  height: 500,
  width: '100%',
  bufferSize: 5,
  keyField: 'id',
  loading: false,
});

const emit = defineEmits<{
  'row-click': [row: T, index: number, event: MouseEvent];
  'cell-click': [row: T, column: ColumnConfig<T>, index: number, event: MouseEvent];
  scroll: [scrollTop: number, scrollLeft: number, startIndex: number, endIndex: number];
}>();

const headerHeight = ref(40);
const scrollbarWidth = ref(0);

const normalizeSize = (size: number | string) => {
  if (typeof size === 'number') {
    return `${size}px`;
  }
  if (/^\d+(\.\d+)?$/.test(size)) {
    return `${size}px`;
  }
  return size;
};

const getColumnStyle = (column: ColumnConfig<T>) => {
  const width = column.width ? normalizeSize(column.width) : '';

  if (width) {
    return {
      width,
      flex: `0 0 ${width}`,
      textAlign: column.align || 'left',
    };
  }

  return {
    flex: '1 1 0',
    minWidth: '0',
    textAlign: column.align || 'left',
  };
};

const getRowKey = (row: T, fallbackIndex: number) => {
  const keyValue = row[props.keyField];
  return typeof keyValue === 'string' || typeof keyValue === 'number' ? keyValue : fallbackIndex;
};

const tableStyle = computed(() => ({
  width: normalizeSize(props.width),
  height: normalizeSize(props.height),
}));

const containerHeight = computed(() => {
  const numericHeight =
    typeof props.height === 'number' ? props.height : Number.parseFloat(props.height);

  if (Number.isFinite(numericHeight)) {
    return Math.max(0, numericHeight - headerHeight.value);
  }

  return 460; // 默认值
});

const updateScrollbarWidth = () => {
  if (!containerRef.value) return;
  scrollbarWidth.value = containerRef.value.offsetWidth - containerRef.value.clientWidth;
};

// 使用 toRef 获取 props.data 的响应式引用
const dataRef = toRef(props, 'data');

// 使用虚拟滚动逻辑
const { visibleData, startIndex, offsetTop, totalHeight, scrollTo, refresh } = useVirtual<T>({
  containerRef,
  data: dataRef,
  rowHeight: props.rowHeight,
  containerHeight: containerHeight,
  bufferSize: props.bufferSize,
});

// 处理行点击
const handleRowClick = (row: T, index: number, event: MouseEvent) => {
  emit('row-click', row, index, event);
};

// 暴露方法
defineExpose({
  scrollTo,
  getVisibleData: () => visibleData.value,
  refresh,
});

watch(
  () => [props.data.length, props.height, props.width],
  () => {
    nextTick(() => {
      updateScrollbarWidth();
    });
  },
  { immediate: true },
);

onMounted(() => {
  nextTick(() => {
    updateScrollbarWidth();
  });
  window.addEventListener('resize', updateScrollbarWidth);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateScrollbarWidth);
});
</script>

<style scoped>
.virtual-table {
  position: relative;
  overflow: hidden;
  border: 1px solid #eaeaea;
  border-radius: 4px;
}

.table-header {
  display: flex;
  height: v-bind(headerHeight + 'px');
  background-color: #f5f7fa;
  border-bottom: 1px solid #eaeaea;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-cell {
  padding: 0 12px;
  display: flex;
  align-items: center;
  font-weight: 500;
  border-right: 1px solid #eaeaea;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.table-body {
  position: relative;
  overflow: auto;
}

.placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;
}

.visible-data {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  will-change: transform;
}

.loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 3;
}
</style>
