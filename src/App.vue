<template>
  <div class="app">
    <h1>高性能虚拟滚动表格</h1>

    <div class="controls">
      <button @click="generateData(100000)">生成10万数据</button>
      <button @click="generateData(1000000)">生成100万数据</button>
      <button @click="scrollToRandom">随机滚动</button>
      <button @click="clearData">清空数据</button>
    </div>

    <div class="metrics">
      <span>数据量: {{ data.length }}</span>
      <span>可见区: {{ visibleRange.start }} - {{ visibleRange.end }}</span>
      <span>首屏渲染: {{ firstScreenRenderMs !== null ? `${firstScreenRenderMs}ms` : '--' }}</span>
      <span>滚动 FPS(采样): {{ sampledFps !== null ? sampledFps : '--' }}</span>
      <span>排序状态: {{ sortLabel }}</span>
    </div>

    <Table
      ref="table"
      :data="data"
      :columns="columns"
      :row-height="36"
      :height="600"
      :buffer-size="6"
      :key-field="'id'"
      :loading="loading"
      @row-click="handleRowClick"
      @sort-change="handleSortChange"
      @scroll="handleScroll"
    >
      <template #cell="{ column, value }">
        <template v-if="column.key === 'email'">
          <a class="email-link" :href="`mailto:${String(value)}`">{{ value }}</a>
        </template>
        <template v-else-if="column.key === 'age'">
          <span class="age-tag" :class="{ 'age-tag--senior': Number(value) >= 60 }">
            {{ value }}
          </span>
        </template>
        <template v-else>
          {{ value }}
        </template>
      </template>
    </Table>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import Table from './components/Table.vue';
import type { ColumnConfig, RowData, SortState, TableExpose } from './types';

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
const firstScreenRenderMs = ref<number | null>(null);
const sampledFps = ref<number | null>(null);
const sortState = ref<SortState<UserRow> | null>(null);
const visibleRange = ref({ start: 0, end: 0 });
const fpsRafId = ref<number | null>(null);
const isSamplingFps = ref(false);

const columns = ref<ColumnConfig<UserRow>[]>([
  { key: 'id', title: 'ID', width: 80, align: 'right', sortable: true },
  { key: 'name', title: '姓名', width: 140, sortable: true },
  { key: 'age', title: '年龄', width: 90, align: 'center', sortable: true },
  { key: 'email', title: '邮箱', width: 240 },
  {
    key: 'address',
    title: '地址',
    sortable: true,
    sorter: (left, right) => left.address.localeCompare(right.address),
  },
]);

const sortLabel = computed(() => {
  if (!sortState.value) {
    return '无';
  }
  const orderLabel = sortState.value.order === 'asc' ? '升序' : '降序';
  return `${sortState.value.key} ${orderLabel}`;
});

const stopFpsSampler = () => {
  if (fpsRafId.value !== null) {
    cancelAnimationFrame(fpsRafId.value);
    fpsRafId.value = null;
  }
  isSamplingFps.value = false;
};

const sampleFps = (durationMs = 1200) => {
  if (isSamplingFps.value) {
    return;
  }

  isSamplingFps.value = true;
  let frameCount = 0;
  const start = performance.now();

  const tick = (timestamp: number) => {
    frameCount += 1;
    const elapsed = timestamp - start;

    if (elapsed >= durationMs) {
      sampledFps.value = Number(((frameCount * 1000) / elapsed).toFixed(1));
      isSamplingFps.value = false;
      fpsRafId.value = null;
      return;
    }

    fpsRafId.value = requestAnimationFrame(tick);
  };

  fpsRafId.value = requestAnimationFrame(tick);
};

// 生成测试数据
const generateData = async (count: number) => {
  const currentTaskId = ++generationTaskId.value;
  const generationStartedAt = performance.now();

  stopFpsSampler();
  sampledFps.value = null;
  firstScreenRenderMs.value = null;
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

    for (let id = startId; id <= endId; id++) {
      batchData.push({
        id,
        name: `User ${id}`,
        age: Math.floor(Math.random() * 57) + 14,
        email: `user${id}@example.com`,
        address: `Address ${id}, Street ${Math.floor(Math.random() * 100)}, City ${Math.floor(Math.random() * 10)}`,
      });
    }

    data.value.push(...batchData);

    if (batch === 0 && firstScreenRenderMs.value === null) {
      await nextTick();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      firstScreenRenderMs.value = Number((performance.now() - generationStartedAt).toFixed(1));
    }

    await new Promise((resolve) => setTimeout(resolve, 0)); // 让出主线程
  }

  if (currentTaskId !== generationTaskId.value) {
    return;
  }

  loading.value = false;
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
  stopFpsSampler();
  data.value = [];
  loading.value = false;
  sampledFps.value = null;
  firstScreenRenderMs.value = null;
  visibleRange.value = { start: 0, end: 0 };
  table.value?.refresh();
};

// 处理行点击
const handleRowClick = (row: UserRow, index: number) => {
  console.log('Row clicked:', row, index);
};

const handleSortChange = (nextSort: SortState<UserRow> | null) => {
  sortState.value = nextSort;
};

// 处理滚动
const handleScroll = (
  scrollTop: number,
  scrollLeft: number,
  startIndex: number,
  endIndex: number,
) => {
  visibleRange.value = { start: startIndex, end: endIndex };
  sampleFps();
  console.log('Scroll:', { scrollTop, scrollLeft, startIndex, endIndex });
};

onBeforeUnmount(() => {
  stopFpsSampler();
});

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
  margin-bottom: 16px;
  color: #333;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
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

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 12px;
  border: 1px solid #e4e8f0;
  border-radius: 6px;
  background: linear-gradient(180deg, #f9fbff 0%, #f5f7fb 100%);
  font-size: 13px;
  color: #42526e;
}

.email-link {
  color: #1d4ed8;
  text-decoration: none;
}

.email-link:hover {
  text-decoration: underline;
}

.age-tag {
  display: inline-flex;
  min-width: 24px;
  justify-content: center;
  padding: 1px 6px;
  border-radius: 10px;
  background-color: #eff6ff;
  color: #1e40af;
}

.age-tag--senior {
  background-color: #ffedd5;
  color: #9a3412;
}
</style>
