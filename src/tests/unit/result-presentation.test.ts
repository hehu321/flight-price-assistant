import { describe, expect, it } from "vitest";
import { defaultResultFilters, displayFlightTime, filterAndSortGroups, groupDurationMinutes, groupLowestPrice, UNKNOWN_AIRLINE } from "@/core/results/result-presentation";
import { MatchedFlightGroup } from "@/shared/types/matching";
import { FlightResult } from "@/shared/types/flight";

function flight(overrides: Partial<FlightResult> = {}): FlightResult {
  return { id: "f", platform: "ctrip", marketingFlightNumber: "CZ1234", airline: "南方航空", departureDate: "2026-08-08", departureTime: "08:00", arrivalTime: "10:00", arrivesNextDay: false, departureAirport: "武汉天河机场", arrivalAirport: "北京大兴机场", direct: true, displayedPrice: 600, totalPrice: 650, priceType: "public", isStartingPrice: false, currency: "CNY", queryContextValid: true, confidence: 90, collectedAt: "", sourceUrl: "", rawPriceText: "", warnings: [], ...overrides };
}
function group(items: FlightResult[]): MatchedFlightGroup { return { id: items[0].id, representative: items[0], results: Object.fromEntries(items.map((item) => [item.platform, [item]])), matchConfidence: 95, matchReasons: [], warnings: [] }; }

describe("结果分组展示逻辑", () => {
  it("按航司、直飞与价格筛选，并以组最低价判断价格区间", () => {
    const ctrip = flight(); const qunar = flight({ id: "q", platform: "qunar", displayedPrice: 720, totalPrice: 760 });
    const nonDirect = flight({ id: "m", platform: "fliggy", airline: "东方航空", direct: false, displayedPrice: 500, totalPrice: 550 });
    const filters = { ...defaultResultFilters(), airlines: ["南方航空"], maxPrice: 700, direct: "direct" as const };
    const visible = filterAndSortGroups([group([ctrip, qunar]), group([nonDirect])], filters);
    expect(visible).toHaveLength(1); expect(groupLowestPrice(visible[0])).toBe(650); expect(visible[0].results.qunar?.[0].totalPrice).toBe(760);
  });

  it("空航司统一归类为待确认，智能排序优先直飞与已核验价格", () => {
    const direct = group([flight({ id: "d", airline: "", totalPrice: 700, displayedPrice: 700 })]);
    const cheapNonDirect = group([flight({ id: "n", platform: "qunar", direct: false, totalPrice: 500, displayedPrice: 500 })]);
    const visible = filterAndSortGroups([cheapNonDirect, direct], { ...defaultResultFilters(), airlines: [UNKNOWN_AIRLINE] });
    expect(visible).toHaveLength(1); expect(visible[0].representative.direct).toBe(true);
  });

  it("适配器携带日期的时间字段仍应只展示时分并正确计算航程", () => {
    const dated = group([flight({ departureTime: "08月01日 12:50", arrivalTime: "08月01日 14:50" })]);
    expect(displayFlightTime(dated.representative.departureTime)).toBe("12:50");
    expect(groupDurationMinutes(dated)).toBe(120);
  });
});
