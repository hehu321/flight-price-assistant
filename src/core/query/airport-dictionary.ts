import { ALL_DOMESTIC_AIRPORTS } from "@/shared/constants/airports";
import { CityAirportMapping } from "@/shared/types/storage";
import { FlightLocation } from "@/shared/types/flight";
import { searchInternationalLocations } from "./international-location-dictionary";

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

export function domesticMappingToLocation(item: CityAirportMapping): FlightLocation {
  return {
    displayName: item.cityName,
    iataCode: item.cityCode,
    type: "city",
    countryOrRegion: "中国大陆",
    market: "domestic",
    aliases: item.aliases,
    timeZone: "Asia/Shanghai",
  };
}

export function searchLocations(query: string, market: "domestic" | "international_hmt"): FlightLocation[] {
  if (market === "domestic") return searchAirports(query).map(domesticMappingToLocation);

  // 国际航线的一端经常是中国大陆城市。切换到“国际·港澳台”后仍应能
  // 搜索、确认武汉(WUH)、北京(BJS)等国内机场城市，不能只展示海外字典。
  const candidates = [
    ...searchAirports(query).map(domesticMappingToLocation),
    ...searchInternationalLocations(query),
  ];
  return candidates.filter((item, index) => candidates.findIndex((candidate) => candidate.iataCode === item.iataCode) === index);
}
