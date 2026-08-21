<template>
  <section class="progress-panel" aria-live="polite" aria-label="平台采集进度">
    <header class="progress-header">
      <div><strong>实时采集进度</strong><span>{{ terminalCount }}/{{ enabledStates.length }} 平台已结束 · 已采集 {{ resultCount }} 条</span></div>
      <a-button type="link" size="small" @click="expanded = !expanded">{{ expanded ? '收起' : '展开详情' }}</a-button>
    </header>
    <div class="progress-track" aria-hidden="true"><i :style="{ width: `${progressPercent}%` }" /></div>
    <div class="platform-summary">
      <span v-for="state in enabledStates" :key="state.platformId" :class="['platform-dot', state.status]">{{ platformName(state.platformId) }} · {{ state.resultCount }}</span>
    </div>
    <div v-if="expanded" class="platform-detail-list">
      <article v-for="state in enabledStates" :key="state.platformId" :class="['platform-detail', state.status]">
        <div><strong>{{ platformName(state.platformId) }}</strong><span>{{ statusLabel(state.status) }} · {{ state.resultCount }} 条</span><small>{{ state.message || '正在等待平台响应' }}</small></div>
        <a-button v-if="needsLogin(state)" size="small" type="primary" @click="$emit('login', state.platformId)">去登录</a-button>
        <a-button v-else-if="canRetry(state)" size="small" @click="$emit('retry', state.platformId)">{{ retryLabel(state) }}</a-button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Button as AButton } from "ant-design-vue";
import { ComparisonTask, PlatformTaskState, PlatformTaskStatus } from "@/shared/types/platform";
import { SupportedPlatform } from "@/shared/types/flight";
import { isPlatformTaskTerminalForUi } from "@/core/task/task-progress";

const props = defineProps<{ task: ComparisonTask }>();
defineEmits<{ (event: "retry", platform: SupportedPlatform): void; (event: "login", platform: SupportedPlatform): void }>();
const expanded = ref(false);
const enabledStates = computed(() => props.task.query.enabledPlatforms.map((platform) => props.task.platforms[platform]).filter(Boolean));
const terminalCount = computed(() => enabledStates.value.filter((state) => isPlatformTaskTerminalForUi(state.status)).length);
const resultCount = computed(() => enabledStates.value.reduce((sum, state) => sum + state.resultCount, 0));
const progressPercent = computed(() => enabledStates.value.length ? Math.max(6, Math.round(enabledStates.value.reduce((sum, state) => sum + state.progress, 0) / enabledStates.value.length)) : 0);
function platformName(platform: SupportedPlatform) { return ({ ctrip: "携程", qunar: "去哪儿", fliggy: "飞猪", tongcheng: "同程" })[platform]; }
function statusLabel(status: PlatformTaskStatus) { return ({ completed: "已完成", empty: "无符合航班", unsupported_route: "当前航线不支持", login_required: "需要登录", captcha_required: "需要验证", sms_verification_required: "需要短信验证", failed: "采集失败", page_changed: "页面规则变化", needs_user_action: "等待处理", rate_limited: "访问受限", page_timeout: "页面加载超时", loading: "加载页面中", waiting_results: "等待航班结果", extracting: "持续采集中", validating_context: "校验查询条件", verifying_price: "核验公开费用" } as Partial<Record<PlatformTaskStatus, string>>)[status] || "准备中"; }
function needsLogin(state: PlatformTaskState) { return state.errorCode === "LOGIN_REQUIRED" || ["login_required", "captcha_required", "sms_verification_required"].includes(state.status); }
function canRetry(state: PlatformTaskState) { return !needsLogin(state) && (state.retryable || ["loading", "waiting_results", "extracting", "needs_user_action", "failed", "page_changed", "interrupted"].includes(state.status)); }
function retryLabel(state: PlatformTaskState) { return ["loading", "waiting_results", "extracting"].includes(state.status) ? "重新获取" : "重试"; }
</script>

<style scoped>
.progress-panel{margin-bottom:var(--space-3);padding:var(--space-3);border:1px solid var(--border-color);border-radius:var(--radius-lg);background:var(--bg-secondary);box-shadow:var(--shadow-sm)}.progress-header{display:flex;justify-content:space-between;gap:var(--space-2);align-items:center}.progress-header div{display:flex;flex-direction:column;gap:2px}.progress-header strong{font-size:var(--font-body)}.progress-header span{font-size:var(--font-caption);color:var(--text-muted)}.progress-track{height:5px;margin:var(--space-3) 0 var(--space-2);overflow:hidden;border-radius:999px;background:var(--bg-elevated)}.progress-track i{display:block;height:100%;border-radius:inherit;background:var(--accent-gradient);transition:width .24s ease}.platform-summary{display:flex;gap:var(--space-1);flex-wrap:wrap}.platform-dot{font-size:11px;color:var(--text-secondary);padding:3px 7px;border-radius:999px;background:var(--bg-elevated)}.platform-dot.completed,.platform-dot.empty{color:var(--success-color);background:var(--success-soft)}.platform-dot.unsupported_route{color:var(--text-muted);background:var(--bg-subtle)}.platform-dot.failed,.platform-dot.login_required,.platform-dot.captcha_required,.platform-dot.sms_verification_required,.platform-dot.page_changed,.platform-dot.page_timeout{color:var(--danger-color);background:var(--danger-soft)}.platform-detail-list{display:grid;gap:var(--space-2);margin-top:var(--space-3)}.platform-detail{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);padding-top:var(--space-2);border-top:1px solid var(--border-color)}.platform-detail div{min-width:0;display:grid;grid-template-columns:auto 1fr;gap:2px 6px;align-items:baseline}.platform-detail strong{font-size:var(--font-caption)}.platform-detail span,.platform-detail small{font-size:11px;color:var(--text-muted)}.platform-detail small{grid-column:1/-1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.platform-detail.completed{border-left:2px solid var(--success-color);padding-left:var(--space-2)}.platform-detail.unsupported_route{border-left:2px solid var(--text-muted);padding-left:var(--space-2)}.platform-detail.failed,.platform-detail.login_required,.platform-detail.captcha_required,.platform-detail.sms_verification_required,.platform-detail.page_timeout{border-left:2px solid var(--danger-color);padding-left:var(--space-2)}
</style>
