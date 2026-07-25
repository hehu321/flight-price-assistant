import { PlatformTabBinding, SupportedPlatform } from "@/shared/types/platform";
import { logger } from "@/shared/logger/logger";

class TabManager {
  private bindings: Map<string, PlatformTabBinding> = new Map(); // key: taskId_platform

  constructor() {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.onRemoved.addListener((tabId) => this.removeBindingByTabId(tabId));
    }
  }

  async openPlatformTab(
    taskId: string,
    platform: SupportedPlatform,
    url: string,
    options: { active?: boolean } = {}
  ): Promise<number> {
    const key = `${taskId}_${platform}`;
    const existing = this.bindings.get(key);
    if (existing) {
      try {
        await chrome.tabs.get(existing.tabId);
        logger.info(`标签页已存在 (${platform}), tabId: ${existing.tabId}`);
        return existing.tabId;
      } catch {
        // The user may have closed a platform tab.  Do not keep a stale
        // binding that prevents a fresh result page from being created.
        this.bindings.delete(key);
      }
    }

    if (typeof chrome !== "undefined" && chrome.tabs) {
      const tab = await chrome.tabs.create({ url, active: options.active ?? false });
      const tabId = tab.id!;
      this.bindings.set(key, { taskId, platform, tabId, createdAt: new Date().toISOString() });
      return tabId;
    } else {
      // Mock 环境 fallback
      const mockTabId = Math.floor(Math.random() * 10000);
      this.bindings.set(key, { taskId, platform, tabId: mockTabId, createdAt: new Date().toISOString() });
      return mockTabId;
    }
  }

  getTabBinding(taskId: string, platform: SupportedPlatform): PlatformTabBinding | undefined {
    return this.bindings.get(`${taskId}_${platform}`);
  }

  getBindingByTabId(tabId: number): PlatformTabBinding | undefined {
    for (const binding of this.bindings.values()) {
      if (binding.tabId === tabId) return binding;
    }
    return undefined;
  }

  async closeTab(tabId: number): Promise<void> {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      try {
        await chrome.tabs.remove(tabId);
      } catch (err) {
        logger.warn("关闭标签页失败:", err);
      }
    }
    this.removeBindingByTabId(tabId);
  }

  private removeBindingByTabId(tabId: number): void {
    for (const [key, binding] of this.bindings.entries()) {
      if (binding.tabId === tabId) this.bindings.delete(key);
    }
  }
}

export const tabManager = new TabManager();
