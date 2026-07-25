import { FlightQuery } from "@/shared/types/flight";
import { getCityCode } from "@/core/query/city-normalizer";

/** 同程结果页接受 IATA 城市码，直接打开结果页可避免首页表单异步联想的不确定性。 */
export function buildTongchengSearchUrl(query: FlightQuery): string | null {
  const originCode = (getCityCode(query.originCity) || query.originCityCode || query.originCity).toUpperCase();
  const destinationCode = (getCityCode(query.destinationCity) || query.destinationCityCode || query.destinationCity).toUpperCase();
  if (!originCode || !destinationCode || !query.departureDate) return null;

  if (isLocalMockPage("3004")) {
    return `http://localhost:3004/results.html?from=${originCode}&to=${destinationCode}&date=${query.departureDate}`;
  }

  return `https://www.ly.com/flights/itinerary/oneway/${originCode}-${destinationCode}?date=${encodeURIComponent(query.departureDate)}`;
}

function isLocalMockPage(port: string): boolean {
  return typeof window !== "undefined"
    && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    && window.location.port === port;
}
