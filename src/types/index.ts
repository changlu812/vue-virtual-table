import type { VNode } from "vue";

export interface ColumnConfig {
  key: string; // 列唯一标识
  title: string; // 列标题
  width?: number | string; // 列宽度
  align?: "left" | "center" | "right"; // 对齐方式
  render?: (row: any, index: number) => VNode | string; // 自定义渲染函数
  sortable?: boolean; // 是否可排序
  resizable?: boolean; // 是否可调整宽度
}

export interface TableProps {
  data: any[];
  columns: ColumnConfig[];
  rowHeight?: number;
  height?: number | string;
  width?: number | string;
  bufferSize?: number;
  keyField?: string;
  loading?: boolean;
}

export interface VirtualProps {
  data: any[];
  rowHeight: number;
  containerHeight: number;
  bufferSize?: number;
}
