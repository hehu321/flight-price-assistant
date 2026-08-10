<template>
  <div class="page-container fade-enter-active">
    <header class="page-header">
      <span class="eyebrow">工作空间</span>
      <h2>设置与偏好</h2>
      <p>管理外观、数据保留策略和本机 AI Agent 连接。</p>
    </header>

    <div class="settings-card">
      <div class="setting-item">
        <div><strong>外观主题</strong><small>切换整个侧边栏和 Ant Design 组件的显示模式</small></div>
        <a-select v-model:value="settingsStore.theme" :options="themeOptions" @change="settingsStore.setTheme(settingsStore.theme)" />
      </div>

      <div class="setting-item">
        <div><strong>数据保留天数</strong><small>到期后自动清理本地快照和价格记录</small></div>
        <a-select v-model:value="settingsStore.retentionDays" :options="retentionOptions" @change="settingsStore.setRetentionDays" />
      </div>

      <div class="setting-item">
        <div><strong>保留平台结果页</strong><small>默认在采集完成后自动关闭；开启后保留页面，便于手动复核</small></div>
        <a-switch :checked="settingsStore.keepTabs" @change="settingsStore.toggleKeepTabs" />
      </div>
    </div>

    <div class="settings-card agent-card">
      <div class="agent-heading">
        <div>
          <h3>AI Agent 接入</h3>
          <p>仅通过本机 Native Messaging 连接，不会向网页开放接口。</p>
        </div>
        <a-tag :color="agentStatus.connected ? 'success' : 'default'">{{ agentStatus.connected ? 'Host 已连接' : 'Host 未连接' }}</a-tag>
      </div>
      <a-alert v-if="agentStatus.lastError" type="warning" show-icon :message="String(agentStatus.lastError)" />
      <div class="agent-meta">当前任务：{{ agentStatus.queue?.activeRunId || '无' }} · 排队：{{ agentStatus.queue?.queueLength || 0 }}</div>
      <div class="agent-actions">
        <a-button size="small" @click="loadAgentStatus">刷新状态</a-button>
        <a-button size="small" @click="copyInstallCommand">复制安装命令</a-button>
      </div>
      <div v-if="agentStatus.clients?.length" class="client-list">
        <div v-for="client in agentStatus.clients" :key="client.id" class="client-item">
          <div>
            <strong>{{ client.name }}</strong>
            <span>{{ client.id }}</span>
            <small>首次请求：{{ formatDate(client.firstRequestedAt) }}</small>
          </div>
          <div class="client-controls">
            <a-tag :color="statusColor(client.status)">{{ client.status }}</a-tag>
            <a-button v-if="client.status === 'pending'" type="primary" size="small" @click="updateClient(client.id, 'approved')">允许</a-button>
            <a-button v-if="client.status === 'pending'" size="small" @click="updateClient(client.id, 'rejected')">拒绝</a-button>
            <a-button v-if="client.status === 'approved'" danger size="small" @click="updateClient(client.id, 'revoked')">撤销</a-button>
          </div>
        </div>
      </div>
      <a-empty v-else :image="false" description="尚无 AI Agent 请求授权" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from "vue";
import { useSettingsStore } from "../stores/settings";
import { Alert as AAlert, Button as AButton, Empty as AEmpty, Select as ASelect, Switch as ASwitch, Tag as ATag } from "ant-design-vue";

const settingsStore = useSettingsStore();
const themeOptions = [{ value: "dark", label: "深色科技感 (默认)" }, { value: "light", label: "亮色洁净" }];
const retentionOptions = [{ value: 7, label: "7 天" }, { value: 30, label: "30 天 (推荐)" }, { value: 90, label: "90 天" }];
const agentStatus = reactive<any>({ connected: false, queue: {}, clients: [] });

onMounted(() => {
  void settingsStore.loadPreferences();
  loadAgentStatus();
});

function loadAgentStatus() {
  if (typeof chrome === "undefined") return;
  chrome.runtime.sendMessage({ type: "GET_AGENT_INTEGRATION_STATUS" }, (response) => {
    if (response?.success) Object.assign(agentStatus, response.status);
  });
}

function updateClient(clientId: string, status: "approved" | "rejected" | "revoked") {
  chrome.runtime.sendMessage({ type: "UPDATE_AGENT_CLIENT_STATUS", payload: { clientId, status } }, () => loadAgentStatus());
}

function statusColor(status: string) {
  return status === "approved" ? "success" : status === "pending" ? "processing" : "default";
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-";
}

async function copyInstallCommand() {
  await navigator.clipboard?.writeText("npm run bridge:install:mac -- --extension-id <Chrome 扩展 ID>");
}
</script>

<style scoped>
.page-container{width:100%;max-width:900px;margin:0 auto;padding:var(--space-5);padding-bottom:88px}.page-header{display:flex;flex-direction:column;gap:var(--space-1);margin-bottom:var(--space-5)}.eyebrow{font-size:var(--font-caption);font-weight:700;letter-spacing:.06em;color:var(--accent-color)}.page-header h2{font-size:var(--font-title);letter-spacing:-.02em;margin:0}.page-header p{font-size:var(--font-body);color:var(--text-secondary);margin:0}.settings-card{background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:0 var(--space-4);box-shadow:var(--shadow-sm)}.setting-item{display:flex;justify-content:space-between;gap:var(--space-4);align-items:center;padding:var(--space-4) 0;border-bottom:1px solid var(--border-color)}.setting-item:last-child{border-bottom:none}.setting-item>div{display:grid;gap:3px}.setting-item strong{font-size:var(--font-body)}.setting-item small{font-size:var(--font-caption);color:var(--text-muted)}.setting-item :deep(.ant-select){width:190px}.agent-card{margin-top:var(--space-4);padding:var(--space-4)}.agent-heading{display:flex;justify-content:space-between;gap:var(--space-3);align-items:flex-start}.agent-heading h3{margin:0;font-size:18px}.agent-heading p,.agent-meta{color:var(--text-muted);font-size:var(--font-caption);line-height:1.6;margin:var(--space-1) 0 var(--space-3)}.agent-actions{display:flex;gap:var(--space-2);margin:var(--space-3) 0}.client-list{display:grid;gap:var(--space-2)}.client-item{display:flex;justify-content:space-between;gap:var(--space-3);padding:var(--space-3) 0;border-top:1px solid var(--border-color)}.client-item strong,.client-item span,.client-item small{display:block}.client-item strong{font-size:var(--font-body)}.client-item span,.client-item small{color:var(--text-muted);font-size:var(--font-caption);max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.client-controls{display:flex;align-items:center;flex-wrap:wrap;justify-content:flex-end;gap:var(--space-1)}@media(max-width:620px){.page-container{padding:var(--space-4);padding-bottom:80px}.setting-item{align-items:flex-start;flex-direction:column;gap:var(--space-2)}.setting-item :deep(.ant-select){width:100%}.agent-heading{flex-direction:column}.client-item{align-items:flex-start;flex-direction:column}.client-controls{justify-content:flex-start}}
</style>
