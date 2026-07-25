import { FlightQuery } from "@/shared/types/flight";
import { getCityCode } from "@/core/query/city-normalizer";

export function buildQunarSearchUrl(query: FlightQuery): string | null {
  const originCode = (getCityCode(query.originCity) || query.originCityCode || query.originCity).toUpperCase();
  const destCode = (getCityCode(query.destinationCity) || query.destinationCityCode || query.destinationCity).toUpperCase();

  if (isLocalMockPage("3002")) {
    // 去哪儿模拟平台（表单+结果页模式）
    return `http://localhost:3002/results.html?from=${originCode}&to=${destCode}&date=${query.departureDate}`;
  }

  return `https://flight.qunar.com/site/oneway_list.htm?searchDepartureAirport=${query.originCity}&searchArrivalAirport=${query.destinationCity}&searchDepartureTime=${query.departureDate}`;
}

function isLocalMockPage(port: string): boolean {
  return typeof window !== "undefined"
    && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    && window.location.port === port;
}
