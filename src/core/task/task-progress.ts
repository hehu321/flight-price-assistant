import { ComparisonTask, PlatformTaskStatus } from "@/shared/types/platform";

/**
 * A task is considered busy only while one of its selected platforms still
 * needs background work.  This is deliberately separate from the agent run
 * lifecycle: a login/captcha state needs user attention, but must not keep
 * the manual "一键比价" button permanently disabled.
 */
const UI_TERMINAL_STATUSES = new Set<PlatformTaskStatus>([
  "completed",
  "empty",
  "failed",
  "cancelled",
  "rate_limited",
  "page_timeout",
  "interrupted",
  "needs_user_action",
  "page_changed",
]);

export function isPlatformTaskTerminalForUi(status: PlatformTaskStatus): boolean {
  return UI_TERMINAL_STATUSES.has(status);
}

export function isTaskInProgress(task: ComparisonTask): boolean {
  const platformBusy = task.query.enabledPlatforms.some((platform) => {
    const state = task.platforms[platform];
    return state !== undefined && !isPlatformTaskTerminalForUi(state.status);
  });
  const packageBusy = Object.values(task.roundTripPackageStates || {}).some((state) => state !== undefined && !isPlatformTaskTerminalForUi(state.status));
  return platformBusy || packageBusy;
}
