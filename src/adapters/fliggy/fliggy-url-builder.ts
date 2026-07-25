import { FlightQuery } from "@/shared/types/flight";
import { getCityCode } from "@/core/query/city-normalizer";

export function buildFliggySearchUrl(query: FlightQuery): string | null {
  const originCode = (getCityCode(query.originCity) || query.originCityCode || query.originCity).toUpperCase();
  const destCode = (getCityCode(query.destinationCity) || query.destinationCityCode || query.destinationCity).toUpperCase();

  if (isLocalMockPage("3003")) {
    // 飞猪模拟平台
    return `http://localhost:3003/results.html?from=${originCode}&to=${destCode}&date=${query.departureDate}`;
  }

  const params = new URLSearchParams({
    tripType: "0",
    depCity: originCode,
    arrCity: destCode,
    depDate: query.departureDate,
    depCityName: query.originCity,
    arrCityName: query.destinationCity,
  });
  return `https://sjipiao.fliggy.com/flight_search_result.htm?${params.toString()}`;
}

function isLocalMockPage(port: string): boolean {
  return typeof window !== "undefined"
    && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    && window.location.port === port;
}
