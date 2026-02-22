import type { App, Plugin } from 'vue';
import Table from '../components/Table.vue';

export const VirtualTable = Table;
export const TableComponent = Table;

export { useVirtual } from '../composables/useVirtual';
export * from '../types';

const VueVirtualTable: Plugin = {
  install(app: App) {
    app.component('VirtualTable', Table);
  },
};

export default VueVirtualTable;
