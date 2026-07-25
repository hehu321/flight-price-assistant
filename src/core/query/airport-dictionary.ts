import { ALL_DOMESTIC_AIRPORTS } from "@/shared/constants/airports";
import { CityAirportMapping } from "@/shared/types/storage";

export function findCityAirports(cityNameOrCode: string): CityAirportMapping | undefined {
  if (!cityNameOrCode) return undefined;
  const raw = cityNameOrCode.trim();
  const target = raw.toUpperCase();
  return ALL_DOMESTIC_AIRPORTS.find(
    (item) =>
      item.cityName === raw ||
      item.cityCode === target ||
      item.aliases?.some((alias) => alias === raw) ||
      item.airports.some((airport) => airport.airportCode === target)
  );
}

export function searchAirports(query: string): CityAirportMapping[] {
  if (!query || query.trim() === "") return ALL_DOMESTIC_AIRPORTS.slice(0, 10);
  const q = query.trim().toLowerCase();
  return ALL_DOMESTIC_AIRPORTS.filter(
    (item) =>
      item.cityName.toLowerCase().includes(q) ||
      item.cityCode.toLowerCase().includes(q) ||
      item.aliases?.some((alias) => alias.toLowerCase().includes(q)) ||
      item.airports.some(
        (a) => a.airportName.toLowerCase().includes(q) || a.airportCode.toLowerCase().includes(q)
      )
  );
}
