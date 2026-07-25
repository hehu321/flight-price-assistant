import { ALL_DOMESTIC_AIRPORTS } from "@/shared/constants/airports";

export function normalizeCityName(input: string): string {
  if (!input) return "";
  const clean = input.trim().replace(/(市|自治区|特别行政区)$/, "");
  const found = ALL_DOMESTIC_AIRPORTS.find(
    (item) =>
      item.cityName === clean ||
      item.aliases?.includes(clean) ||
      item.airports.some((airport) => airport.airportCode === clean.toUpperCase())
  );
  return found ? found.cityName : clean;
}

export function getCityCode(cityName: string): string | undefined {
  const norm = normalizeCityName(cityName);
  const found = ALL_DOMESTIC_AIRPORTS.find(
    (item) => item.cityName === norm || item.aliases?.includes(norm)
  );
  return found?.cityCode;
}
