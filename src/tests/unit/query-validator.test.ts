import { describe, it, expect } from "vitest";
import { validateFlightQuery } from "@/core/query/query-validator";
import { FlightQuery } from "@/shared/types/flight";

describe("query-validator", () => {
  it("应该成功通过合法单程行程校验", () => {
    const query: FlightQuery = {
      tripType: "oneway",
      originCity: "武汉",
      destinationCity: "北京",
      departureDate: "2026-08-16",
      adultCount: 1,
      cabinClass: "economy",
      directOnly: false,
      enabledPlatforms: ["ctrip"],
    };

    const res = validateFlightQuery(query);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("应该拦截出发地与目的地相同的情况", () => {
    const query: FlightQuery = {
      tripType: "oneway",
      originCity: "武汉",
      destinationCity: "武汉",
      departureDate: "2026-08-16",
      adultCount: 1,
      cabinClass: "economy",
      directOnly: false,
      enabledPlatforms: ["ctrip"],
    };

    const res = validateFlightQuery(query);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain("出发地与目的地不能相同");
  });

  it("应该拦截缺少返程日期的往返行程", () => {
    const query: FlightQuery = {
      tripType: "roundtrip",
      originCity: "武汉",
      destinationCity: "北京",
      departureDate: "2026-08-16",
      adultCount: 1,
      cabinClass: "economy",
      directOnly: false,
      enabledPlatforms: ["ctrip"],
    };

    const res = validateFlightQuery(query);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain("往返行程必须填写返程日期");
  });
});
