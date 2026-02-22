<template>
  <div class="app">
    <h1>高性能虚拟滚动表格</h1>

    <div class="controls">
      <button @click="generateData(100000)">生成10万数据</button>
      <button @click="generateData(1000000)">生成100万数据</button>
      <button @click="scrollToRandom">随机滚动</button>
      <button @click="clearData">清空数据</button>
      <div class="stats">
        数据量: {{ data.length }} | 可见行数:
        {{ table?.getVisibleData().length || 0 }}
      </div>
    </div>

    <Table
      ref="table"
      :data="data"
      :columns="columns"
      :row-height="36"
      :height="600"
      :buffer-size="5"
      :loading="loading"
      @row-click="handleRowClick"
      @scroll="handleScroll"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import Table from './components/Table.vue';
import type { ColumnConfig, RowData, TableExpose } from './types';

interface UserRow extends RowData {
  id: number;
  name: string;
  age: number;
  email: string;
  address: string;
}

const table = ref<TableExpose<UserRow> | null>(null);
const data = ref<UserRow[]>([]);
const loading = ref(false);
const generationTaskId = ref(0);

const columns = ref<ColumnConfig<UserRow>[]>([
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 120 },
  { key: 'age', title: '年龄', width: 80, align: 'center' },
  { key: 'email', title: '邮箱', width: 200 },
  {
    key: 'address',
    title: '地址',
    render: (row) => {
      return row.address.length > 20 ? row.address.substring(0, 20) + '...' : row.address;
    },
  },
]);

// 生成测试数据
const generateData = async (count: number) => {
  const currentTaskId = ++generationTaskId.value;
  loading.value = true;
  data.value = [];
  table.value?.scrollTo(0);

  // 分批生成数据
  const batchSize = 10000;
  const totalBatches = Math.ceil(count / batchSize);

  for (let batch = 0; batch < totalBatches; batch++) {
    if (currentTaskId !== generationTaskId.value) {
      return;
    }

    const batchData: UserRow[] = [];
    const startId = batch * batchSize + 1;
    const endId = Math.min((batch + 1) * batchSize, count);

    for (let i = startId; i <= endId; i++) {
      const row = {
        id: i,
        name: `User ${i}`,
        age: Math.floor(Math.random() * 57) + 14,
        email: `user${i}@example.com`,
        address: `Address ${i}, Street ${Math.floor(Math.random() * 100)}, City ${Math.floor(Math.random() * 10)}`,
      };
      // 保持响应式
      batchData.push(row);
    }

    data.value.push(...batchData);
    await new Promise((resolve) => setTimeout(resolve, 0)); // 让出主线程
  }

  if (currentTaskId !== generationTaskId.value) {
    return;
  }

  loading.value = false;
  // 数据生成完成后刷新表格
  setTimeout(() => {
    table.value?.refresh();
  }, 100);
};

// 随机滚动
const scrollToRandom = () => {
  if (data.value.length === 0) return;
  const randomIndex = Math.floor(Math.random() * data.value.length);
  table.value?.scrollTo(randomIndex);
};

// 清空数据
const clearData = () => {
  generationTaskId.value++;
  data.value = [];
  loading.value = false;
  table.value?.refresh();
};

// 处理行点击
const handleRowClick = (row: UserRow, index: number) => {
  console.log('Row clicked:', row, index);
};

// 处理滚动
const handleScroll = (
  scrollTop: number,
  scrollLeft: number,
  startIndex: number,
  endIndex: number,
) => {
  console.log('Scroll:', { scrollTop, scrollLeft, startIndex, endIndex });
};

// 初始化
onMounted(() => {
  generateData(100000); // 初始生成10万数据
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  background-color: #f0f2f5;
}

.app {
  max-width: 1200px;
  margin: 20px auto;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

h1 {
  margin-bottom: 20px;
  color: #333;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.controls button {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.controls button:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.stats {
  margin-left: auto;
  color: #666;
  font-size: 14px;
}
</style>
