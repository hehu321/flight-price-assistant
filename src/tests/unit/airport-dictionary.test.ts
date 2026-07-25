import { describe, expect, it } from "vitest";
import { getCityCode, normalizeCityName } from "@/core/query/city-normalizer";
import { findCityAirports, searchAirports } from "@/core/query/airport-dictionary";
import { ALL_DOMESTIC_AIRPORTS } from "@/shared/constants/airports";

describe("全国民用机场城市字典", () => {
  it("覆盖完整的大陆民用运输机场城市集合，而非仅热门城市", () => {
    expect(ALL_DOMESTIC_AIRPORTS.length).toBeGreaterThanOrEqual(260);
    expect(ALL_DOMESTIC_AIRPORTS.flatMap((city) => city.airports)).toHaveLength(276);
  });

  it("可按偏远城市、机场代码和常用服务地别名解析", () => {
    expect(findCityAirports("阿里")).toMatchObject({ cityCode: "NGQ" });
    expect(findCityAirports("KHG")).toMatchObject({ cityName: "喀什" });
    expect(findCityAirports("西双版纳")).toMatchObject({ cityCode: "JHG" });
    expect(searchAirports("喀纳斯")).toEqual(
      expect.arrayContaining([expect.objectContaining({ cityCode: "KJI" })])
    );
  });

  it("城市名或别名均生成正确的平台查询代码", () => {
    expect(getCityCode("阿里")).toBe("NGQ");
    expect(getCityCode("西双版纳")).toBe("JHG");
    expect(normalizeCityName("西双版纳")).toBe("景洪");
  });
});
