import { describe, expect, it } from "vitest";
import { MONITOR_INTERVAL_MINUTES, recordMonitoringPrice, scheduleWatch } from "@/core/monitor/price-monitor";
import { PriceWatch } from "@/shared/types/storage";

const now = new Date("2026-08-06T00:00:00.000Z");
function watch(overrides: Partial<PriceWatch> = {}): PriceWatch {
  return { id: "watch-1", journeyKey: "WUH-BJS-2026-08-20", originCity: "武汉", destinationCity: "北京", departureDate: "2026-08-20", enabledPlatforms: ["ctrip", "qunar"], createdAt: now.toISOString(), updatedAt: now.toISOString(), monitorEnabled: true, ...overrides };
}

describe("自动票价监控规则", () => {
  it("按六小时安排下一次检查", () => {
    const scheduled = scheduleWatch(watch(), now);
    expect(scheduled.intervalMinutes).toBe(MONITOR_INTERVAL_MINUTES);
    expect(scheduled.nextRunAt).toBe("2026-08-06T06:00:00.000Z");
  });

  it("首次达到目标价会提醒，首次基线不因没有目标价提醒", () => {
    const target = recordMonitoringPrice(watch({ targetPrice: 600 }), 580, 2, now);
    expect(target.notification?.type).toBe("target_reached");
    const baseline = recordMonitoringPrice(watch(), 580, 2, now);
    expect(baseline.notification).toBeUndefined();
  });

  it("较上次有效含税价降价五十元才提醒", () => {
    const dropped = recordMonitoringPrice(watch({ lastSuccessfulPrice: 680 }), 630, 2, now);
    expect(dropped.notification?.type).toBe("price_drop");
    const smallDrop = recordMonitoringPrice(watch({ lastSuccessfulPrice: 680 }), 631, 2, now);
    expect(smallDrop.notification).toBeUndefined();
  });

  it("没有已核验含税价不会触发提醒", () => {
    const result = recordMonitoringPrice(watch({ targetPrice: 600, lastSuccessfulPrice: 680 }), undefined, 1, now);
    expect(result.watch.lastOutcome).toBe("partial");
    expect(result.notification).toBeUndefined();
  });
});
