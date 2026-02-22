import type { VNodeChild } from 'vue';

export type RowData = Record<string, unknown>;

export interface ColumnConfig<T extends RowData = RowData> {
  key: string; // 列唯一标识
  title: string; // 列标题
  width?: number | string; // 列宽度
  align?: 'left' | 'center' | 'right'; // 对齐方式
  render?: (row: T, index: number) => VNodeChild; // 自定义渲染函数
  sortable?: boolean; // 是否可排序
  resizable?: boolean; // 是否可调整宽度
}

export interface TableProps<T extends RowData = RowData> {
  data: T[];
  columns: ColumnConfig<T>[];
  rowHeight?: number;
  height?: number | string;
  width?: number | string;
  bufferSize?: number;
  keyField?: string;
  loading?: boolean;
}

export interface VirtualProps<T extends RowData = RowData> {
  data: T[];
  rowHeight: number;
  containerHeight: number;
  bufferSize?: number;
}

export interface TableExpose<T extends RowData = RowData> {
  scrollTo: (index: number) => void;
  getVisibleData: () => T[];
  refresh: () => void;
}
