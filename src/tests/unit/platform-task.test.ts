import { describe, expect, it } from "vitest";
import { createComparisonTask } from "@/core/task/platform-task";
import { FlightQuery } from "@/shared/types/flight";

const baseQuery: FlightQuery = {
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
  enabledPlatforms: ["ctrip"],
};

describe("比价任务平台状态", () => {
  it("将未选择的平台标记为已取消，避免任务永久等待", () => {
    const task = createComparisonTask(baseQuery);

    expect(task.platforms.ctrip.status).toBe("idle");
    expect(task.platforms.qunar.status).toBe("cancelled");
    expect(task.platforms.fliggy.status).toBe("cancelled");
    expect(task.platforms.tongcheng.status).toBe("cancelled");
  });
});
