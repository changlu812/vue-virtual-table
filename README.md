# Vue Virtual Table

一个基于 Vue 3 + TypeScript 的虚拟滚动表格项目，重点演示：

- TypeScript 工程化约束（泛型、`keyof`、严格事件参数）
- 百万级数据虚拟滚动（可视区计算 + 节流 + 超大滚动高度映射）
- 高复用表格组件能力（排序、列配置、插槽渲染）

## 技术栈

- Vue 3 (`<script setup>` + 泛型组件)
- TypeScript（`strict: true`）
- Vite
- ESLint + Prettier + Husky + lint-staged

## 主要能力

### 1. TS 类型工程化

- `ColumnConfig<T>` 使用 `keyof` 约束列字段，防止字段名误传。
- `TableProps<T>`、`TableExpose<T>`、事件回调均为泛型约束，避免 `any` 混用。
- `sort-change`、`row-click`、`cell-click` 事件参数均为强类型。

### 2. 虚拟滚动核心优化

- 仅渲染可视区 + 缓冲区数据。
- 滚动监听节流（16ms）。
- 大数据滚动高度映射，规避浏览器最大滚动高度限制，支持百万级行数滚动。
- 可见节点使用固定 key 池复用（减少频繁销毁/创建）。

### 3. 组件复用与扩展

- 支持列级排序（默认比较 + 自定义 `sorter`）。
- 支持插槽渲染（`#cell`），便于业务侧定制单元格展示。
- 支持列宽、对齐、`render` 渲染函数等列配置能力。

## 开发

```bash
npm install
npm run dev
```

## 校验

```bash
npm run lint
npm run build
```

## 性能观测方式

页面顶部指标面板可直接观察：

- 首屏渲染时间（首批数据生成到首帧可见）
- 滚动 FPS 采样值
- 当前可见区间
- 当前排序状态

建议在同一机器、同一浏览器下固定样本（10 万 / 100 万）多次取均值，再把结果写入简历。
