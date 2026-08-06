import { defineStore } from "pinia";
import { PriceWatch, QuerySnapshot } from "@/shared/types/storage";
import { clearAllPriceRecords } from "@/core/storage/price-record-repository";
import { clearAllQuerySnapshots, getAllQuerySnapshots } from "@/core/storage/query-snapshot-repository";
import { clearAllPriceWatchEvents, clearAllPriceWatches, deletePriceWatch, getAllPriceWatches, savePriceWatch } from "@/core/storage/price-watch-repository";

export const useHistoryStore = defineStore("history", {
  state: () => ({
    snapshots: [] as QuerySnapshot[],
    watches: [] as PriceWatch[],
    loading: false,
  }),
  actions: {
    async fetchHistory() {
      this.loading = true;
      try {
        const [snapshots, watches] = await Promise.all([getAllQuerySnapshots(), getAllPriceWatches()]);
        this.snapshots = snapshots;
        this.watches = watches;
      } finally {
        this.loading = false;
      }
    },
    async saveWatch(watch: PriceWatch) {
      await savePriceWatch(watch);
      const index = this.watches.findIndex((item) => item.id === watch.id);
      if (index >= 0) this.watches.splice(index, 1, watch);
      else this.watches.push(watch);
    },
    async deleteWatch(id: string) {
      await deletePriceWatch(id);
      this.watches = this.watches.filter((watch) => watch.id !== id);
    },
    async clearHistory() {
      await Promise.all([clearAllQuerySnapshots(), clearAllPriceRecords(), clearAllPriceWatches(), clearAllPriceWatchEvents()]);
      this.snapshots = [];
      this.watches = [];
    },
  },
});
