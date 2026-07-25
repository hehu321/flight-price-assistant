import { describe, expect, it } from "vitest";
import { createComparisonTask } from "@/core/task/platform-task";
import { isPlatformTaskTerminalForUi, isTaskInProgress } from "@/core/task/task-progress";
import { FlightQuery } from "@/shared/types/flight";

const query: FlightQuery = {
  tripType: "oneway",
  originCity: "武汉",
  originCityCode: "WUH",
  destinationCity: "北京",
  destinationCityCode: "BJS",
  departureDate: "2026-08-16",
  adultCount: 1,
  childCount: 0,
  cabinClass: "economy",
  directOnly: false,
  enabledPlatforms: ["ctrip", "qunar"],
};

describe("查询按钮执行状态", () => {
  it("新建任务在平台仍等待时保持加载", () => {
    expect(isTaskInProgress(createComparisonTask(query))).toBe(true);
  });

  it("重载后恢复的终态任务不会锁定一键比价", () => {
    const task = createComparisonTask(query);
    task.platforms.ctrip.status = "completed";
    task.platforms.qunar.status = "empty";

    expect(isTaskInProgress(task)).toBe(false);
  });

  it("失败、限流、中断、需用户操作等状态均可重新发起查询", () => {
    const terminalStatuses = [
      "failed",
      "rate_limited",
      "page_timeout",
      "interrupted",
      "needs_user_action",
      "page_changed",
      "cancelled",
    ] as const;

    for (const status of terminalStatuses) {
      const task = createComparisonTask({ ...query, enabledPlatforms: ["ctrip"] });
      task.platforms.ctrip.status = status;
      expect(isTaskInProgress(task), status).toBe(false);
    }
  });

  it("仅将实际采集中状态视为后台仍在执行", () => {
    expect(isPlatformTaskTerminalForUi("extracting")).toBe(false);
    expect(isPlatformTaskTerminalForUi("waiting_results")).toBe(false);
    expect(isPlatformTaskTerminalForUi("interrupted")).toBe(true);
    expect(isPlatformTaskTerminalForUi("page_timeout")).toBe(true);
    expect(isPlatformTaskTerminalForUi("needs_user_action")).toBe(true);
  });
});
