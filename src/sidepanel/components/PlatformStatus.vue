<template>
  <div class="platform-card" :class="state.status">
    <div class="platform-name">{{ platformName }}</div>
    <div class="status-msg">{{ state.message }}</div>
    <div v-if="state.status === 'extracting'" class="progress-detail">结果会持续追加到下方列表</div>
    <div v-if="requiresLogin" class="user-action-prompt">
      <a-button size="small" type="primary" @click="$emit('login')">去登录</a-button>
    </div>
    <div v-else-if="canRetry" class="user-action-prompt">
      <a-button size="small" type="primary" @click="$emit('retry')">
        {{ retryLabel }}
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { PlatformTaskState, SupportedPlatform } from "@/shared/types/platform";
import { Button as AButton } from "ant-design-vue";

const props = defineProps<{
  platformId: SupportedPlatform;
  state: PlatformTaskState;
}>();

defineEmits(["retry", "login"]);

const platformName = computed(() => {
  switch (props.platformId) {
    case "ctrip": return "携程旅行";
    case "qunar": return "去哪儿旅行";
    case "fliggy": return "飞猪旅行";
    case "tongcheng": return "同程旅行";
  }
});

const requiresLogin = computed(() => props.state.errorCode === "LOGIN_REQUIRED");

const canRetry = computed(() => !requiresLogin.value && (props.state.status === "needs_user_action"
  || (props.state.status === "failed" && props.state.retryable)
  || props.state.status === "loading"
  || props.state.status === "waiting_results"
  || props.state.status === "extracting"));

const retryLabel = computed(() => {
  if (props.state.status === "needs_user_action") return "处理完成，重新提取";
  if (props.state.status === "loading" || props.state.status === "waiting_results" || props.state.status === "extracting") {
    return "页面加载过久，重新获取";
  }
  return "重新提取当前页面";
});
</script>

<style scoped>
.platform-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}
.platform-name {
  font-weight: bold;
  font-size: 13px;
}
.status-msg {
  font-size: 12px;
  color: var(--text-secondary);
}
.progress-detail {
  margin-top: 3px;
  font-size: 11px;
  color: var(--text-muted);
}
.completed { border-left: 4px solid var(--success-color); }
.needs_user_action { border-left: 4px solid var(--warning-color); }
.failed { border-left: 4px solid var(--danger-color); }
.btn-action {
  margin-top: 6px;
  background: var(--accent-color);
  color: white;
  padding: 4px 8px;
  font-size: 11px;
  border-radius: 4px;
}
</style>
