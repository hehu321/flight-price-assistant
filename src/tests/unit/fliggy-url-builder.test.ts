import { describe, expect, it } from "vitest";
import { buildFliggySearchUrl } from "@/adapters/fliggy/fliggy-url-builder";

describe("飞猪真实结果页 URL", () => {
  it("直接打开 sjipiao 航班结果页并保留城市名称", () => {
    const url = buildFliggySearchUrl({
      originCity: "北京",
      destinationCity: "杭州",
      originCityCode: "BJS",
      destinationCityCode: "HGH",
      departureDate: "2026-07-25",
      tripType: "oneway",
      adultCount: 1,
      cabinClass: "economy",
      directOnly: false,
      enabledPlatforms: ["fliggy"],
    });

    expect(url).toContain("https://sjipiao.fliggy.com/flight_search_result.htm?");
    const params = new URL(url!).searchParams;
    expect(Object.fromEntries(params)).toMatchObject({
      tripType: "0",
      depCity: "BJS",
      arrCity: "HGH",
      depDate: "2026-07-25",
      depCityName: "北京",
      arrCityName: "杭州",
    });
  });
});
