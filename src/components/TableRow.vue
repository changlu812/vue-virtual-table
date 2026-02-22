<template>
  <div class="table-row" @click="$emit('click', row, index, $event)">
    <div
      v-for="column in columns"
      :key="column.key"
      class="table-cell"
      :style="getColumnStyle(column)"
      @click.stop="$emit('cell-click', row, column, index, $event)"
    >
      <slot name="cell" :row="row" :column="column" :index="index" :value="row[column.key]">
        <!-- 自定义渲染 -->
        <template v-if="column.render">
          {{ column.render(row, index) }}
        </template>
        <!-- 默认渲染 -->
        <template v-else>
          {{ row[column.key] }}
        </template>
      </slot>
    </div>
  </div>
</template>

<script lang="ts" setup generic="T extends RowData">
import type { CellSlotProps, ColumnConfig, RowData } from '../types';

defineProps<{
  row: T;
  columns: ColumnConfig<T>[];
  index: number;
}>();

defineEmits<{
  click: [row: T, index: number, event: MouseEvent];
  'cell-click': [row: T, column: ColumnConfig<T>, index: number, event: MouseEvent];
}>();

defineSlots<{
  cell?: (props: CellSlotProps<T>) => unknown;
}>();

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
</script>

<style scoped>
.table-row {
  display: flex;
  height: 36px;
  border-bottom: 1px solid #eaeaea;
  cursor: pointer;
  transition: background-color 0.2s;
}

.table-row:hover {
  background-color: #f5f7fa;
}

.table-cell {
  padding: 0 12px;
  display: flex;
  align-items: center;
  border-right: 1px solid #eaeaea;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
