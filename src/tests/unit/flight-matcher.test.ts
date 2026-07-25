import { describe, it, expect } from "vitest";
import { matchFlightsAcrossPlatforms } from "@/core/matching/flight-matcher";
import { FlightResult } from "@/shared/types/flight";

describe("flight-matcher", () => {
  it("应该成功将同一航班号的不同平台结果归为一组", () => {
    const flightCtrip: FlightResult = {
      id: "1",
      platform: "ctrip",
      marketingFlightNumber: "CZ3137",
      airline: "南方航空",
      departureDate: "2026-08-16",
      departureTime: "08:20",
      arrivalTime: "10:25",
      arrivesNextDay: false,
      departureAirport: "WUH",
      arrivalAirport: "PKX",
      direct: true,
      displayedPrice: 620,
      priceType: "public",
      isStartingPrice: false,
      currency: "CNY",
      queryContextValid: true,
      confidence: 90,
      collectedAt: "",
      sourceUrl: "",
      rawPriceText: "¥620",
      warnings: [],
    };

    const flightQunar: FlightResult = { ...flightCtrip, id: "2", platform: "qunar", displayedPrice: 605 };

    const groups = matchFlightsAcrossPlatforms([flightCtrip, flightQunar]);
    expect(groups).toHaveLength(1);
    expect(groups[0].results.ctrip).toHaveLength(1);
    expect(groups[0].results.qunar).toHaveLength(1);
  });
});
