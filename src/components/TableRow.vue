<template>
  <div
    class="table-row"
    @click="$emit('click', row, index, $event)"
  >
    <div
      v-for="column in columns"
      :key="column.key"
      class="table-cell"
      :style="getColumnStyle(column)"
      @click.stop="$emit('cell-click', row, column, index, $event)"
    >
      <!-- 自定义渲染 -->
      <template v-if="column.render">
        {{ column.render(row, index) }}
      </template>
      <!-- 默认渲染 -->
      <template v-else>
        {{ row[column.key] }}
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ColumnConfig } from '../types';

const props = defineProps({
  row: {
    type: Object,
    required: true
  },
  columns: {
    type: Array as () => ColumnConfig[],
    required: true
  },
  index: {
    type: Number,
    required: true
  }
});

const emit = defineEmits<{
  'click': [row: any, index: number, event: Event];
  'cell-click': [row: any, column: ColumnConfig, index: number, event: Event];
}>();

const normalizeSize = (size: number | string) => {
  if (typeof size === "number") {
    return `${size}px`;
  }
  if (/^\d+(\.\d+)?$/.test(size)) {
    return `${size}px`;
  }
  return size;
};

const getColumnStyle = (column: ColumnConfig) => {
  const width = column.width ? normalizeSize(column.width) : "";

  if (width) {
    return {
      width,
      flex: `0 0 ${width}`,
      textAlign: column.align || "left",
    };
  }

  return {
    flex: "1 1 0",
    minWidth: "0",
    textAlign: column.align || "left",
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
