import { describe, expect, it } from "vitest";
import { buildTongchengSearchUrl } from "@/adapters/tongcheng/tongcheng-url-builder";
import { FlightQuery } from "@/shared/types/flight";

describe("同程查询 URL", () => {
  it("按城市代码和出发日直达单程结果页", () => {
    const query: FlightQuery = {
      tripType: "oneway", originCity: "武汉", originCityCode: "WUH", destinationCity: "北京", destinationCityCode: "BJS",
      departureDate: "2026-07-31", adultCount: 1, cabinClass: "economy", directOnly: false, enabledPlatforms: ["tongcheng"],
    };
    expect(buildTongchengSearchUrl(query)).toBe("https://www.ly.com/flights/itinerary/oneway/WUH-BJS?date=2026-07-31");
  });
});
