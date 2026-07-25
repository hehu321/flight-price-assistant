<template>
  <nav class="bottom-nav" aria-label="主导航">
    <router-link to="/" class="nav-item" exact-active-class="active"><span class="icon-shell"><SearchOutlined /></span><span class="nav-label">查询</span></router-link>
    <router-link to="/results" class="nav-item" active-class="active"><span class="icon-shell badge-shell"><SwapOutlined /><i v-if="resultStatus" :class="['status-dot', resultStatus]"></i></span><span class="nav-label">结果</span></router-link>
    <router-link to="/history" class="nav-item" active-class="active"><span class="icon-shell"><LineChartOutlined /></span><span class="nav-label">历史</span></router-link>
    <router-link to="/settings" class="nav-item" active-class="active"><span class="icon-shell"><SettingOutlined /></span><span class="nav-label">设置</span></router-link>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { LineChartOutlined, SearchOutlined, SettingOutlined, SwapOutlined } from "@ant-design/icons-vue";
import { useResultsStore } from "../stores/results";
import { useTaskStore } from "../stores/task";

const resultsStore = useResultsStore(); const taskStore = useTaskStore();
const resultStatus = computed<"new" | "error" | undefined>(() => {
  const states = taskStore.currentTask ? Object.values(taskStore.currentTask.platforms) : [];
  if (states.some((state) => ["failed", "login_required", "captcha_required", "sms_verification_required", "page_changed", "page_timeout", "needs_user_action"].includes(state.status))) return "error";
  return resultsStore.hasUnseenResults ? "new" : undefined;
});
</script>

<style scoped>
.bottom-nav{display:flex;justify-content:space-around;align-items:center;height:64px;background:var(--nav-bg);backdrop-filter:blur(12px);border-top:1px solid var(--border-color);position:fixed;bottom:0;left:0;right:0;z-index:100}.nav-item{min-width:44px;min-height:52px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:3px;color:var(--text-secondary);font-size:12px;text-decoration:none;border-radius:10px;outline:none;transition:color var(--transition-fast),background var(--transition-fast)}.nav-item:focus-visible{box-shadow:var(--focus-ring)}.icon-shell{width:32px;height:32px;display:grid;place-items:center;position:relative;border-radius:9px;font-size:20px;line-height:1}.nav-item.active{color:var(--accent-color);font-weight:700}.nav-item.active .icon-shell{background:var(--accent-soft)}.status-dot{position:absolute;top:3px;right:3px;width:7px;height:7px;border-radius:50%;border:1px solid var(--bg-secondary)}.status-dot.new{background:var(--accent-color)}.status-dot.error{background:var(--danger-color)}@media(min-width:680px){.bottom-nav{top:0;bottom:0;right:auto;width:88px;height:100vh;flex-direction:column;justify-content:center;gap:10px;border-top:0;border-right:1px solid var(--border-color)}.nav-item{width:72px;min-height:64px;gap:5px}.nav-label{font-size:12px}}
</style>
