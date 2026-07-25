import { defineStore } from "pinia";
import { cleanOldPriceRecords } from "@/core/storage/price-record-repository";
import { cleanOldQuerySnapshots } from "@/core/storage/query-snapshot-repository";

const KEEP_PLATFORM_TABS_KEY = "keep_platform_tabs";
const THEME_KEY = "sidepanel_theme";
const HISTORY_RETENTION_DAYS_KEY = "history_retention_days";

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    theme: "dark" as "dark" | "light",
    // 默认关闭本次查询新开的平台页；用户可在设置中改为保留。
    keepTabs: false,
    retentionDays: 30,
    autoRetry: true,
    maxRetryCount: 1,
  }),
  actions: {
    setTheme(theme: "dark" | "light") {
      this.theme = theme;
      document.documentElement.setAttribute("data-theme", theme);
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        void chrome.storage.local.set({ [THEME_KEY]: theme });
      }
    },
    async loadPreferences() {
      if (typeof chrome === "undefined" || !chrome.storage?.local) return;
      const value = await chrome.storage.local.get([KEEP_PLATFORM_TABS_KEY, THEME_KEY, HISTORY_RETENTION_DAYS_KEY]);
      if (typeof value[KEEP_PLATFORM_TABS_KEY] === "boolean") this.keepTabs = value[KEEP_PLATFORM_TABS_KEY];
      if (value[THEME_KEY] === "dark" || value[THEME_KEY] === "light") this.theme = value[THEME_KEY];
      if ([7, 30, 90].includes(value[HISTORY_RETENTION_DAYS_KEY])) this.retentionDays = value[HISTORY_RETENTION_DAYS_KEY];
      document.documentElement.setAttribute("data-theme", this.theme);
    },
    async toggleKeepTabs(value?: boolean | string | number) {
      this.keepTabs = typeof value === "boolean" ? value : !this.keepTabs;
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        await chrome.storage.local.set({ [KEEP_PLATFORM_TABS_KEY]: this.keepTabs });
      }
    },
    async setRetentionDays(value?: unknown) {
      const days = Number(value);
      if (![7, 30, 90].includes(days)) return;
      this.retentionDays = days;
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        await chrome.storage.local.set({ [HISTORY_RETENTION_DAYS_KEY]: days });
      }
      await Promise.all([cleanOldPriceRecords(days), cleanOldQuerySnapshots(days)]);
    },
  },
});
