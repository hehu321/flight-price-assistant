import { describe, expect, it } from "vitest";
import { buildCtripSearchUrl } from "@/adapters/ctrip/ctrip-url-builder";
import { buildFliggySearchUrl } from "@/adapters/fliggy/fliggy-url-builder";
import { buildQunarSearchUrl } from "@/adapters/qunar/qunar-url-builder";
import { FlightQuery } from "@/shared/types/flight";

const staleCodeQuery: FlightQuery = {
  tripType: "oneway",
  originCity: "武汉",
  originCityCode: "WUH",
  destinationCity: "昆明",
  // Reproduces the reported bug: the UI changed but an old Beijing code was
  // still stored from the previous query.
  destinationCityCode: "BJS",
  departureDate: "2026-08-08",
  adultCount: 1,
  cabinClass: "economy",
  directOnly: false,
  enabledPlatforms: ["ctrip", "qunar", "fliggy"],
};

describe("城市名称与缓存代码同步", () => {
  it("三家平台均以当前昆明城市名解析 KMG，而不是沿用 BJS", () => {
    expect(buildCtripSearchUrl(staleCodeQuery)).toContain("oneway-wuh-kmg?depdate=2026-08-08");

    const qunar = new URL(buildQunarSearchUrl(staleCodeQuery)!);
    expect(qunar.searchParams.get("searchArrivalAirport")).toBe("昆明");

    const fliggy = new URL(buildFliggySearchUrl(staleCodeQuery)!);
    expect(fliggy.searchParams.get("arrCity")).toBe("KMG");
    expect(fliggy.searchParams.get("arrCityName")).toBe("昆明");
  });

  it("携程往返使用平台原生 round 地址并同时携带两个日期", () => {
    const roundtrip: FlightQuery = { ...staleCodeQuery, tripType: "roundtrip", returnDate: "2026-08-12" };
    const url = buildCtripSearchUrl(roundtrip)!;
    expect(url).toContain("round-wuh-kmg");
    expect(url).toContain("depdate=2026-08-08_2026-08-12");
  });
});
