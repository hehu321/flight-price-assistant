import { FlightQuery } from "@/shared/types/flight";
import { getCityCode } from "@/core/query/city-normalizer";
import { isInternationalQuery, queryLocationCode } from "@/core/query/international-location-dictionary";

export function buildFliggySearchUrl(query: FlightQuery): string | null {
  const originCode = (isInternationalQuery(query) ? queryLocationCode(query, "origin") : getCityCode(query.originCity) || query.originCityCode || query.originCity).toUpperCase();
  const destCode = (isInternationalQuery(query) ? queryLocationCode(query, "destination") : getCityCode(query.destinationCity) || query.destinationCityCode || query.destinationCity).toUpperCase();

  if (isLocalMockPage("3003")) {
    // 飞猪模拟平台
    return `http://localhost:3003/results.html?from=${originCode}&to=${destCode}&date=${query.departureDate}`;
  }

  // International and HK/Macao/Taiwan flights are served by a distinct
  // `sijipiao.fliggy.com/ie` application.  Its public route uses
  // `*CityCode`, not the domestic `depCity/arrCity` parameters.  Sending the
  // latter to the domestic endpoint yields the misleading "城市基础数据缺失"
  // page, even for valid IATA city codes such as SHA and TYO.
  if (isInternationalQuery(query)) {
    const params = new URLSearchParams({
      depCityName: query.originCity,
      depCityCode: originCode,
      arrCityName: query.destinationCity,
      arrCityCode: destCode,
      tripType: query.tripType === "roundtrip" ? "1" : "0",
      depDate: query.departureDate,
      arrDate: query.tripType === "roundtrip" && query.returnDate ? query.returnDate : "null",
      searchBy: "lowprice",
      scene: "null",
    });
    return `https://sijipiao.fliggy.com/ie/flight_search_result.htm?${params.toString()}`;
  }

  const params = new URLSearchParams({
    tripType: query.tripType === "roundtrip" ? "1" : "0",
    depCity: originCode,
    arrCity: destCode,
    depDate: query.departureDate,
    depCityName: query.originCity,
    arrCityName: query.destinationCity,
  });
  if (query.tripType === "roundtrip" && query.returnDate) params.set("arrDate", query.returnDate);
  return `https://sjipiao.fliggy.com/flight_search_result.htm?${params.toString()}`;
}

function isLocalMockPage(port: string): boolean {
  return typeof window !== "undefined"
    && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    && window.location.port === port;
}
