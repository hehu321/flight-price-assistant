import { describe, expect, it } from "vitest";
import { buildRoundTripLegQueries, getRoundTripPlatformPlan } from "@/core/query/roundtrip-plan";
import { FlightQuery } from "@/shared/types/flight";

const query: FlightQuery = {
  tripType: "roundtrip", originCity: "武汉", originCityCode: "WUH", originAirport: "天河国际机场", originAirportCode: "WUH",
  destinationCity: "北京", destinationCityCode: "BJS", destinationAirport: "大兴国际机场", destinationAirportCode: "PKX",
  departureDate: "2026-08-17", returnDate: "2026-08-20", adultCount: 1, childCount: 0, cabinClass: "economy", directOnly: false,
  enabledPlatforms: ["ctrip", "qunar"],
};

describe("往返查询计划", () => {
  it("将返程安全转换为反向单程，并交换机场和日期", () => {
    const [outbound, inbound] = buildRoundTripLegQueries(query);
    expect(outbound).toMatchObject({ leg: "outbound", query: { tripType: "oneway", originCityCode: "WUH", destinationCityCode: "BJS", departureDate: "2026-08-17" } });
    expect(inbound).toMatchObject({ leg: "inbound", query: { tripType: "oneway", originCityCode: "BJS", destinationCityCode: "WUH", originAirportCode: "PKX", destinationAirportCode: "WUH", departureDate: "2026-08-20" } });
    expect(inbound.query.returnDate).toBeUndefined();
  });

  it("仅携程可使用已验证的原生套餐流程，其余平台明确降级", () => {
    const plan = getRoundTripPlatformPlan("ctrip");
    expect(plan.nativeAvailability).toBe("verified");
    const fallback = getRoundTripPlatformPlan("qunar");
    expect(fallback.nativeAvailability).toBe("unavailable");
    expect(fallback.fallbackReason).toContain("分段查询");
  });
});
