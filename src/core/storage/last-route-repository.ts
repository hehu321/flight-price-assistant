import { FlightQuery } from "@/shared/types/flight";

const LAST_ROUTE_KEY = "last_successful_flight_route";

export interface LastRouteSelection {
  originCity: string;
  originCityCode?: string;
  originAirport?: string;
  originAirportCode?: string;
  destinationCity: string;
  destinationCityCode?: string;
  destinationAirport?: string;
  destinationAirportCode?: string;
  savedAt: string;
}

function normalizeOptionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function createLastRouteSelection(query: FlightQuery, savedAt = new Date().toISOString()): LastRouteSelection {
  return {
    originCity: query.originCity.trim(),
    originCityCode: normalizeOptionalText(query.originCityCode),
    originAirport: normalizeOptionalText(query.originAirport),
    originAirportCode: normalizeOptionalText(query.originAirportCode),
    destinationCity: query.destinationCity.trim(),
    destinationCityCode: normalizeOptionalText(query.destinationCityCode),
    destinationAirport: normalizeOptionalText(query.destinationAirport),
    destinationAirportCode: normalizeOptionalText(query.destinationAirportCode),
    savedAt,
  };
}

function parseLastRouteSelection(value: unknown): LastRouteSelection | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<LastRouteSelection>;
  const originCity = normalizeOptionalText(candidate.originCity);
  const destinationCity = normalizeOptionalText(candidate.destinationCity);
  if (!originCity || !destinationCity || originCity === destinationCity) return null;

  return {
    originCity,
    originCityCode: normalizeOptionalText(candidate.originCityCode),
    originAirport: normalizeOptionalText(candidate.originAirport),
    originAirportCode: normalizeOptionalText(candidate.originAirportCode),
    destinationCity,
    destinationCityCode: normalizeOptionalText(candidate.destinationCityCode),
    destinationAirport: normalizeOptionalText(candidate.destinationAirport),
    destinationAirportCode: normalizeOptionalText(candidate.destinationAirportCode),
    savedAt: normalizeOptionalText(candidate.savedAt) || new Date(0).toISOString(),
  };
}

/** Saves only a confirmed user query route, not every intermediate form edit. */
export async function saveLastRouteSelection(query: FlightQuery): Promise<void> {
  const selection = createLastRouteSelection(query);
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({ [LAST_ROUTE_KEY]: selection });
    return;
  }
  localStorage.setItem(LAST_ROUTE_KEY, JSON.stringify(selection));
}

export async function getLastRouteSelection(): Promise<LastRouteSelection | null> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    const result = await chrome.storage.local.get(LAST_ROUTE_KEY);
    return parseLastRouteSelection(result[LAST_ROUTE_KEY]);
  }

  const saved = localStorage.getItem(LAST_ROUTE_KEY);
  if (!saved) return null;
  try {
    return parseLastRouteSelection(JSON.parse(saved));
  } catch {
    return null;
  }
}
