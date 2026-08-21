import { PlatformTaskStatus } from "@/shared/types/platform";

const ALLOWED_TRANSITIONS: Record<PlatformTaskStatus, PlatformTaskStatus[]> = {
  idle: ["creating_tab", "unsupported_route", "page_timeout", "cancelled"],
  creating_tab: ["opening", "loading", "unsupported_route", "failed", "page_timeout", "interrupted", "cancelled"],
  opening: ["loading", "login_required", "captcha_required", "failed", "page_timeout", "cancelled"],
  loading: [
    "filling_form",
    "waiting_results",
    "login_required",
    "captcha_required",
    "extracting", "failed", "rate_limited", "page_timeout", "interrupted",
    "cancelled",
  ],
  login_required: ["loading", "needs_user_action", "failed", "cancelled"],
  captcha_required: ["loading", "needs_user_action", "failed", "cancelled"],
  sms_verification_required: ["loading", "needs_user_action", "failed", "cancelled"],
  filling_form: ["submitting_search", "failed", "cancelled"],
  submitting_search: ["waiting_results", "failed", "cancelled"],
  waiting_results: [
    "loading",
    "validating_context",
    "extracting",
    "page_changed",
    "failed", "rate_limited", "page_timeout", "interrupted",
    "cancelled",
  ],
  validating_context: ["extracting", "failed", "cancelled"],
  extracting: ["loading", "verifying_price", "completed", "empty", "failed", "page_timeout", "cancelled"],
  verifying_price: ["completed", "empty", "failed", "page_timeout", "cancelled"],
  completed: ["idle", "creating_tab", "cancelled"],
  empty: ["idle", "creating_tab", "cancelled"],
  unsupported_route: ["idle", "creating_tab", "cancelled"],
  rate_limited: ["idle", "creating_tab", "cancelled"],
  page_timeout: ["idle", "creating_tab", "cancelled"],
  interrupted: ["idle", "creating_tab", "cancelled"],
  needs_user_action: ["loading", "filling_form", "waiting_results", "failed", "cancelled"],
  page_changed: ["failed", "needs_user_action", "cancelled"],
  failed: ["idle", "creating_tab", "cancelled"],
  cancelled: ["idle"],
};

export function canTransition(current: PlatformTaskStatus, target: PlatformTaskStatus): boolean {
  if (current === target) return true;
  const allowed = ALLOWED_TRANSITIONS[current] || [];
  return allowed.includes(target);
}
