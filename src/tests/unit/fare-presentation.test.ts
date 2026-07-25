import { describe, expect, it } from "vitest";
import { presentFare, verifiedTotalPrice } from "@/core/results/fare-presentation";
import { FlightResult } from "@/shared/types/flight";

function flight(overrides: Partial<FlightResult> = {}): FlightResult {
  return { id: "f", platform: "ctrip", marketingFlightNumber: "CZ1234", airline: "南方航空", departureDate: "2026-08-08", departureTime: "08:00", arrivalTime: "10:00", arrivesNextDay: false, departureAirport: "武汉天河机场", arrivalAirport: "北京大兴机场", direct: true, displayedPrice: 600, priceType: "public", isStartingPrice: false, currency: "CNY", queryContextValid: true, confidence: 90, collectedAt: "2026-07-25T08:00:00.000Z", sourceUrl: "", rawPriceText: "", warnings: [], ...overrides };
}

describe("报价展示可信度", () => {
  it("未公开税费时只将价格标记为票面价", () => {
    const result = presentFare(flight());
    expect(result).toMatchObject({ amount: 600, confidence: "ticket_only", label: "票面价" });
    expect(verifiedTotalPrice(flight())).toBeUndefined();
  });

  it("页面给出含税总价时才标记为可比总价", () => {
    const current = flight({ totalPrice: 670, priceDisclosure: "breakdown" });
    expect(presentFare(current)).toMatchObject({ amount: 670, confidence: "verified_total", label: "含税总价" });
    expect(verifiedTotalPrice(current)).toBe(670);
  });
});
