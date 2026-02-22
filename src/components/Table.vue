<template>
  <div class="virtual-table" :style="tableStyle">
    <!-- 表头 -->
    <div class="table-header" :style="{ paddingRight: `${scrollbarWidth}px` }">
      <div
        v-for="column in columns"
        :key="column.key"
        class="header-cell"
        :class="{
          sortable: column.sortable,
          sorted: getSortOrder(column.key) !== null,
        }"
        :style="getColumnStyle(column)"
        @click="toggleSort(column)"
      >
        <span class="header-title">{{ column.title }}</span>
        <span v-if="column.sortable" class="sort-indicator">{{
          getSortIndicator(column.key)
        }}</span>
      </div>
    </div>

    <!-- 表体 -->
    <div ref="containerRef" class="table-body" :style="{ height: containerHeight + 'px' }">
      <!-- 占位元素 -->
      <div class="placeholder" :style="{ height: totalHeight + 'px' }"></div>

      <!-- 可见区域数据 -->
      <div class="visible-data" :style="{ transform: `translateY(${offsetTop}px)` }">
        <TableRow
          v-for="virtualRow in virtualRows"
          :key="virtualRow.recycleKey"
          :row="virtualRow.row"
          :columns="columns"
          :index="virtualRow.rowIndex"
          @click="handleRowClick"
          @cell-click="handleCellClick"
        >
          <template #cell="slotProps">
            <slot name="cell" v-bind="slotProps" />
          </template>
        </TableRow>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading">加载中...</div>
    </div>
  </div>
</template>

<script lang="ts" setup generic="T extends RowData">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import TableRow from './TableRow.vue';
import { useVirtual } from '../composables/useVirtual';
import type { CellSlotProps, ColumnConfig, RowData, RowKey, SortState, TableProps } from '../types';

defineSlots<{
  cell?: (props: CellSlotProps<T>) => unknown;
}>();

const props = withDefaults(defineProps<TableProps<T>>(), {
  rowHeight: 36,
  height: 500,
  width: '100%',
  bufferSize: 5,
  keyField: 'id' as RowKey<T>,
  loading: false,
  defaultSort: null,
});

const emit = defineEmits<{
  'row-click': [row: T, index: number, event: MouseEvent];
  'cell-click': [row: T, column: ColumnConfig<T>, index: number, event: MouseEvent];
  'sort-change': [sort: SortState<T> | null];
  scroll: [scrollTop: number, scrollLeft: number, startIndex: number, endIndex: number];
}>();

// 定义容器 ref
const containerRef = ref<HTMLElement | null>(null);
const headerHeight = ref(40);
const scrollbarWidth = ref(0);
const sortState = ref<SortState<T> | null>(props.defaultSort ?? null);

const normalizeSize = (size: number | string) => {
  if (typeof size === 'number') {
    return `${size}px`;
  }
  if (/^\d+(\.\d+)?$/.test(size)) {
    return `${size}px`;
  }
  return size;
};

const compareCellValue = (left: unknown, right: unknown) => {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right), 'zh-Hans-CN', {
    numeric: true,
    sensitivity: 'base',
  });
};

const sortedData = computed<T[]>(() => {
  const state = sortState.value;
  if (!state) {
    return props.data;
  }

  const sorted = [...props.data];
  const activeColumn = props.columns.find((column) => column.key === state.key);
  const direction = state.order === 'asc' ? 1 : -1;

  if (activeColumn?.sorter) {
    sorted.sort((left, right) => activeColumn.sorter!(left, right) * direction);
    return sorted;
  }

  sorted.sort((left, right) => compareCellValue(left[state.key], right[state.key]) * direction);
  return sorted;
});

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

const getSortOrder = (key: RowKey<T>) => {
  if (sortState.value?.key !== key) {
    return null;
  }
  return sortState.value.order;
};

const getSortIndicator = (key: RowKey<T>) => {
  const order = getSortOrder(key);
  if (order === 'asc') return '▲';
  if (order === 'desc') return '▼';
  return '↕';
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

// 使用虚拟滚动逻辑
const { visibleData, startIndex, endIndex, offsetTop, totalHeight, scrollTo, refresh } =
  useVirtual<T>({
    containerRef,
    data: sortedData,
    rowHeight: props.rowHeight,
    containerHeight: containerHeight,
    bufferSize: props.bufferSize,
  });

const virtualRows = computed(() =>
  visibleData.value.map((row, localIndex) => ({
    row,
    rowIndex: startIndex.value + localIndex,
    // recycleKey ensures DOM nodes are reused while scrolling.
    recycleKey: localIndex,
  })),
);

const setSort = (nextSort: SortState<T> | null) => {
  sortState.value = nextSort;
  emit('sort-change', nextSort);
  nextTick(() => {
    refresh();
  });
};

const toggleSort = (column: ColumnConfig<T>) => {
  if (!column.sortable) {
    return;
  }

  const currentOrder = getSortOrder(column.key);
  if (currentOrder === null) {
    setSort({ key: column.key, order: 'asc' });
    return;
  }

  if (currentOrder === 'asc') {
    setSort({ key: column.key, order: 'desc' });
    return;
  }

  setSort(null);
};

// 处理行点击
const handleRowClick = (row: T, index: number, event: MouseEvent) => {
  emit('row-click', row, index, event);
};

const handleCellClick = (row: T, column: ColumnConfig<T>, index: number, event: MouseEvent) => {
  emit('cell-click', row, column, index, event);
};

// 暴露方法
defineExpose({
  scrollTo,
  getVisibleData: () => visibleData.value,
  refresh,
  setSort,
});

watch(
  () => props.defaultSort,
  (nextDefaultSort) => {
    sortState.value = nextDefaultSort ?? null;
  },
  { deep: true },
);

watch(
  () => [sortedData.value.length, props.height, props.width],
  () => {
    nextTick(() => {
      updateScrollbarWidth();
    });
  },
  { immediate: true },
);

watch(
  [startIndex, endIndex],
  () => {
    emit(
      'scroll',
      containerRef.value?.scrollTop || 0,
      containerRef.value?.scrollLeft || 0,
      startIndex.value,
      endIndex.value,
    );
  },
  { flush: 'post' },
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

.header-title {
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-cell.sortable {
  cursor: pointer;
  user-select: none;
}

.header-cell.sortable:hover {
  background-color: #edf3ff;
}

.header-cell.sorted {
  color: #1f5eff;
}

.sort-indicator {
  margin-left: 6px;
  font-size: 12px;
  line-height: 1;
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
