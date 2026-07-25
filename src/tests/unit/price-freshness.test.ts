import { describe, expect, it } from "vitest";
import { getPriceFreshness } from "@/core/analytics/price-freshness";

describe("价格新鲜度", () => {
  const now = new Date("2026-07-24T12:00:00.000Z").getTime();
  it("区分刚查询、近期与历史快照", () => {
    expect(getPriceFreshness("2026-07-24T11:55:00.000Z", now).level).toBe("fresh");
    expect(getPriceFreshness("2026-07-24T11:30:00.000Z", now).level).toBe("recent");
    expect(getPriceFreshness("2026-07-24T09:00:00.000Z", now).level).toBe("historical");
    expect(getPriceFreshness("2026-07-22T12:00:00.000Z", now).level).toBe("stale");
  });
});
