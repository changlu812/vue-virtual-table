# vue-virtual-table虚拟滚动表格组件库

一个面向 Vue 3 的虚拟滚动表格组件库，支持百万级数据、TypeScript 强类型、排序与插槽扩展。

## 1. 功能特性

- 高性能虚拟滚动：只渲染可视区 + 缓冲区行。
- 大数据滚动支持：内置滚动高度映射，规避浏览器最大滚动像素限制。
- 类型安全：`ColumnConfig<T>` + `keyof`，减少字段传错和类型混用。
- 可扩展：支持列排序、`#cell` 插槽、自定义 `sorter`。

## 2. 安装

### 2.1 通过 npm 安装

```bash
npm i vue-virtual-table
```

### 2.2 通过本地 tgz 安装（未发布时）

先在组件库项目目录执行：

```bash
npm run build:lib
npm pack
```

然后在业务项目执行（建议使用绝对路径）：

```bash
npm i D:\vue-virtual-table\vue-virtual-table-0.0.0.tgz
```

## 3. 快速开始

### 3.1 全局注册（插件方式）

```ts
import { createApp } from 'vue';
import App from './App.vue';
import VueVirtualTable from 'vue-virtual-table';
import 'vue-virtual-table/style.css';

createApp(App).use(VueVirtualTable).mount('#app');
```

模板中直接使用：

```vue
<VirtualTable :data="data" :columns="columns" />
```

### 3.2 按需引入（推荐）

```vue
<script setup lang="ts">
import { VirtualTable } from 'vue-virtual-table';
import 'vue-virtual-table/style.css';
</script>
```

## 4. TypeScript 使用示例

```ts
import type { ColumnConfig } from 'vue-virtual-table';

interface UserRow {
  id: number;
  name: string;
  age: number;
  email: string;
}

const columns: ColumnConfig<UserRow>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'name', title: '姓名' },
  { key: 'age', title: '年龄', sortable: true },
  {
    key: 'email',
    title: '邮箱',
    sorter: (a, b) => a.email.localeCompare(b.email),
  },
];
```

## 5. API 说明

### 5.1 Props

- `data: T[]`  
  表格数据源。
- `columns: ColumnConfig<T>[]`  
  列配置，`key` 受 `keyof T` 约束。
- `rowHeight?: number`（默认 `36`）  
  行高（px）。
- `height?: number | string`（默认 `500`）  
  表格整体高度。
- `width?: number | string`（默认 `'100%'`）  
  表格宽度。
- `bufferSize?: number`（默认 `5`）  
  虚拟滚动缓冲区行数。
- `keyField?: keyof T`  
  行唯一键字段名。
- `loading?: boolean`  
  是否显示加载态。
- `defaultSort?: { key: keyof T; order: 'asc' | 'desc' } | null`  
  默认排序状态。

### 5.2 ColumnConfig<T>

- `key: keyof T` 列字段名
- `title: string` 列标题
- `width?: number | string` 列宽
- `align?: 'left' | 'center' | 'right'` 对齐
- `render?: (row: T, index: number) => VNodeChild` 自定义渲染函数
- `sortable?: boolean` 是否可排序
- `sorter?: (a: T, b: T) => number` 自定义排序函数

### 5.3 Events

- `row-click(row, index, event)` 行点击
- `cell-click(row, column, index, event)` 单元格点击
- `sort-change(sortState)` 排序状态变化
- `scroll(scrollTop, scrollLeft, startIndex, endIndex)` 滚动变化

### 5.4 Slots

- `#cell="{ row, column, index, value }"`  
  自定义单元格内容。

示例：

```vue
<template #cell="{ column, value }">
  <a v-if="column.key === 'email'" :href="`mailto:${value}`">{{ value }}</a>
  <span v-else>{{ value }}</span>
</template>
```

### 5.5 Expose

通过 `ref` 可调用：

- `scrollTo(index: number)` 滚动到指定行
- `refresh()` 刷新虚拟区计算
- `getVisibleData()` 获取当前可见数据
- `setSort(sortState | null)` 代码设置排序

## 6. 常见问题

### 6.1 为什么百万数据滚动行号可能出现上限？

浏览器本身存在滚动像素上限。本库已内置逻辑滚动映射，保证可继续访问后续数据。

### 6.2 安装 tgz 报 ENOENT 怎么办？

说明路径不对。请使用 tgz 的绝对路径安装，例如：

```bash
npm i D:\vue-virtual-table\vue-virtual-table-0.0.0.tgz
```

## 7. 开发与构建

```bash
npm run dev          # 启动 demo
npm run build:demo   # 构建 demo
npm run build:lib    # 构建库产物 + d.ts
npm run lint         # 代码校验
```
