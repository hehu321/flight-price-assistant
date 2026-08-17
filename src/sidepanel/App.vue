<template>
  <a-config-provider :theme="antdTheme" :locale="zhCN">
  <div class="app-layout">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <BottomNav />
  </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { ConfigProvider as AConfigProvider } from "ant-design-vue";
import zhCN from "ant-design-vue/es/locale/zh_CN";
import * as dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import BottomNav from "./components/BottomNav.vue";
import { createSidepanelAntdTheme } from "./antd-theme";
import { useTaskStore } from "./stores/task";
import { useResultsStore } from "./stores/results";
import { useSettingsStore } from "./stores/settings";
import { ExtensionMessage, TaskStateChangedPayload } from "@/shared/types/message";
import { FlightResult, RoundTripPackageResult, SupportedPlatform } from "@/shared/types/flight";

const taskStore = useTaskStore();
const resultsStore = useResultsStore();
const settingsStore = useSettingsStore();
const antdTheme = computed(() => createSidepanelAntdTheme(settingsStore.theme));
dayjs.locale("zh-cn");

function handleRuntimeMessage(message: ExtensionMessage) {
  if (message.type !== "TASK_STATE_CHANGED" || !message.payload) return;

  const payload = message.payload as TaskStateChangedPayload;
  if (taskStore.currentTask?.id !== payload.taskId) return;

  taskStore.updatePlatformState(payload.platform, payload.state);
  if (payload.packageState) taskStore.updatePackageState(payload.platform, payload.packageState);
  if (payload.results) {
    resultsStore.addPlatformResults(payload.platform, payload.results);
  }
  if (payload.packages) resultsStore.addPlatformPackages(payload.platform, payload.packages);
}

onMounted(() => {
  void settingsStore.loadPreferences();
  if (typeof chrome !== "undefined" && chrome.runtime) {
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    chrome.runtime.sendMessage({ type: "GET_CURRENT_SNAPSHOT" }, (response) => {
      if (!response?.task) return;
      taskStore.setTask(response.task);
      const persistedResults = response.results as Record<SupportedPlatform, FlightResult[]> | undefined;
      resultsStore.setResults(persistedResults ? Object.values(persistedResults).flat() : []);
      const persistedPackages = Object.values(response.task.roundTripPackages || {}).flat() as RoundTripPackageResult[];
      resultsStore.setRoundTripPackages(persistedPackages);
    });
  }
});

onUnmounted(() => {
  if (typeof chrome !== "undefined" && chrome.runtime) {
    chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
  }
});
</script>

<style>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-primary);
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

@media (min-width: 680px) {
  .app-layout {
    padding-left: 88px;
  }
}
</style>
