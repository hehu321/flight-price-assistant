import { describe, expect, it } from "vitest";
import { buildCtripSearchUrl } from "@/adapters/ctrip/ctrip-url-builder";
import { buildFliggySearchUrl } from "@/adapters/fliggy/fliggy-url-builder";
import { buildQunarSearchUrl } from "@/adapters/qunar/qunar-url-builder";
import { buildTongchengSearchUrl } from "@/adapters/tongcheng/tongcheng-url-builder";
import { searchInternationalLocations } from "@/core/query/international-location-dictionary";
import { validateFlightQuery } from "@/core/query/query-validator";
import { FlightQuery } from "@/shared/types/flight";

const query: FlightQuery = {
  tripType: "oneway", market: "international_hmt",
  originCity: "北京", originCityCode: "BJS", originLocation: { displayName: "北京", iataCode: "BJS", type: "city", countryOrRegion: "中国大陆", market: "domestic" },
  destinationCity: "东京", destinationCityCode: "TYO", destinationLocation: { displayName: "东京", englishName: "Tokyo", iataCode: "TYO", type: "city", countryOrRegion: "日本", market: "international_hmt" },
  departureDate: "2099-09-15", adultCount: 1, childCount: 0, cabinClass: "economy", directOnly: false,
  enabledPlatforms: ["ctrip", "qunar", "fliggy", "tongcheng"],
};

describe("国际及港澳台查询", () => {
  it("城市目录支持中文、英文和 IATA 代码", () => {
    expect(searchInternationalLocations("东京")[0]).toMatchObject({ iataCode: "TYO" });
    expect(searchInternationalLocations("Singapore")[0]).toMatchObject({ iataCode: "SIN" });
    expect(searchInternationalLocations("HND")[0]).toMatchObject({ iataCode: "HND" });
  });

  it("携程、去哪儿、飞猪采用国际路径，同程明确不生成国内假链接", () => {
    expect(buildCtripSearchUrl(query)).toContain("/international/search/oneway-bjs-tyo");
    const qunar = new URL(buildQunarSearchUrl(query)!);
    expect(qunar.pathname).toBe("/site/oneway_list_inter.htm");
    expect(qunar.searchParams.get("searchDepartureAirport")).toBe("北京");
    expect(qunar.searchParams.get("searchArrivalAirport")).toBe("东京");
    expect(qunar.searchParams.get("searchDepartureTime")).toBe("2099-09-15");
    expect(qunar.searchParams.get("fromCode")).toBe("BJS");
    expect(qunar.searchParams.get("toCode")).toBe("TYO");
    expect(qunar.searchParams.get("adultNum")).toBe("1");
    const fliggy = buildFliggySearchUrl(query);
    expect(fliggy).toContain("sijipiao.fliggy.com/ie/flight_search_result.htm");
    expect(fliggy).toContain("depCityCode=BJS");
    expect(fliggy).toContain("arrCityCode=TYO");
    expect(buildTongchengSearchUrl(query)).toBeNull();
  });

  it("去哪儿国际往返生成已验证的往返对比页直链", () => {
    const roundTrip = { ...query, tripType: "roundtrip" as const, returnDate: "2099-09-22" };
    const qunar = new URL(buildQunarSearchUrl(roundTrip)!);
    expect(qunar.pathname).toBe("/site/interroundtrip_compare.htm");
    expect(qunar.searchParams.get("fromCity")).toBe("北京");
    expect(qunar.searchParams.get("toCity")).toBe("东京");
    expect(qunar.searchParams.get("fromDate")).toBe("2099-09-15");
    expect(qunar.searchParams.get("toDate")).toBe("2099-09-22");
    expect(qunar.searchParams.get("fromCode")).toBe("BJS");
    expect(qunar.searchParams.get("toCode")).toBe("TYO");
    expect(qunar.searchParams.get("isInter")).toBe("true");
  });

  it("国际输入必须是选中的三位 IATA 候选", () => {
    const invalid = { ...query, destinationLocation: undefined, destinationCityCode: undefined };
    expect(validateFlightQuery(invalid, new Date("2099-01-01T00:00:00+08:00")).errors.join()).toContain("IATA");
  });
});
