import { describe, expect, it } from "vitest";
import { chinaDateString } from "@/shared/utils/china-date";
import { validateFlightQuery } from "@/core/query/query-validator";
import { FlightQuery } from "@/shared/types/flight";

describe("中国时区日期", () => {
  it("在 UTC 前一日时仍以中国日期校验", () => {
    const now = new Date("2026-08-16T16:30:00.000Z");
    expect(chinaDateString(now)).toBe("2026-08-17");
    const query: FlightQuery = { tripType: "oneway", originCity: "武汉", destinationCity: "北京", departureDate: "2026-08-17", adultCount: 1, cabinClass: "economy", directOnly: false, enabledPlatforms: ["ctrip"] };
    expect(validateFlightQuery(query, now).valid).toBe(true);
  });
});
