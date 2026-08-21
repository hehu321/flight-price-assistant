import { FlightResult, SupportedPlatform } from "@/shared/types/flight";
import { MatchedFlightGroup } from "@/shared/types/matching";
import { isComparableCnyFare } from "./fare-presentation";

export type ResultSort = "recommended" | "price_asc" | "price_desc" | "depart_asc" | "depart_desc" | "arrive_asc" | "duration_asc";

export interface ResultFilterState {
  platforms: SupportedPlatform[];
  airlines: string[];
  departureAirports: string[];
  arrivalAirports: string[];
  minPrice?: number;
  maxPrice?: number;
  direct: "all" | "direct" | "non_direct";
  departurePeriod: "all" | "morning" | "afternoon" | "evening";
  arrivalPeriod: "all" | "morning" | "afternoon" | "evening";
  maxDuration?: number;
  verifiedOnly: boolean;
  sort: ResultSort;
}

export const UNKNOWN_AIRLINE = "待确认航空公司";

export function defaultResultFilters(): ResultFilterState {
  return {
    platforms: ["ctrip", "qunar", "fliggy", "tongcheng"], airlines: [], departureAirports: [], arrivalAirports: [],
    direct: "all", departurePeriod: "all", arrivalPeriod: "all", verifiedOnly: false, sort: "recommended",
  };
}

export function filterAndSortGroups(groups: MatchedFlightGroup[], filters: ResultFilterState): MatchedFlightGroup[] {
  return groups
    .map((group) => projectPlatforms(group, filters.platforms))
    .filter((group) => Object.keys(group.results).length > 0)
    .filter((group) => matches(group, filters))
    .sort((a, b) => compareGroups(a, b, filters.sort));
}

export function groupOffers(group: MatchedFlightGroup): FlightResult[] {
  return Object.values(group.results).flatMap((items) => items || []);
}

export function groupLowestPrice(group: MatchedFlightGroup): number | undefined {
  const prices = groupOffers(group).filter((flight) => (flight.currency || "CNY") === "CNY").map(priceOf);
  return prices.length ? Math.min(...prices) : undefined;
}

export function groupLowestVerifiedPrice(group: MatchedFlightGroup): number | undefined {
  const prices = groupOffers(group).filter(isComparableCnyFare).map((flight) => flight.totalPrice!);
  return prices.length ? Math.min(...prices) : undefined;
}

export function groupDurationMinutes(group: MatchedFlightGroup): number {
  const flight = group.representative;
  const start = toMinutes(flight.departureTime);
  const end = toMinutes(flight.arrivalTime) + (flight.arrivesNextDay ? 24 * 60 : 0);
  return end >= start ? end - start : end + 24 * 60 - start;
}

/** Platform adapters sometimes retain the page date beside a time (e.g. 08月01日 12:50). */
export function displayFlightTime(value: string): string {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})(?![\s\S]*\d{1,2}:\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "--:--";
}

export function filterCount(filters: ResultFilterState): number {
  return [filters.platforms.length < 4, filters.airlines.length > 0, filters.departureAirports.length > 0,
    filters.arrivalAirports.length > 0, filters.minPrice !== undefined, filters.maxPrice !== undefined,
    filters.direct !== "all", filters.departurePeriod !== "all", filters.arrivalPeriod !== "all",
    filters.maxDuration !== undefined, filters.verifiedOnly].filter(Boolean).length;
}

function projectPlatforms(group: MatchedFlightGroup, platforms: SupportedPlatform[]): MatchedFlightGroup {
  const results: MatchedFlightGroup["results"] = {};
  for (const platform of platforms) if (group.results[platform]?.length) results[platform] = group.results[platform];
  return { ...group, results };
}

function matches(group: MatchedFlightGroup, filters: ResultFilterState): boolean {
  const representative = group.representative;
  const airline = normalizedAirline(representative.airline);
  const lowest = groupLowestPrice(group);
  const verified = groupLowestVerifiedPrice(group);
  return (!filters.airlines.length || filters.airlines.includes(airline))
    && (!filters.departureAirports.length || filters.departureAirports.includes(representative.departureAirport))
    && (!filters.arrivalAirports.length || filters.arrivalAirports.includes(representative.arrivalAirport))
    && (filters.direct === "all" || (filters.direct === "direct" ? representative.direct : !representative.direct))
    && (filters.minPrice === undefined || (lowest !== undefined && lowest >= filters.minPrice))
    && (filters.maxPrice === undefined || (lowest !== undefined && lowest <= filters.maxPrice))
    && (!filters.verifiedOnly || verified !== undefined)
    && inPeriod(representative.departureTime, filters.departurePeriod)
    && inPeriod(representative.arrivalTime, filters.arrivalPeriod)
    && (filters.maxDuration === undefined || groupDurationMinutes(group) <= filters.maxDuration);
}

function compareGroups(a: MatchedFlightGroup, b: MatchedFlightGroup, sort: ResultSort): number {
  const aPrice = groupLowestPrice(a) ?? Number.POSITIVE_INFINITY; const bPrice = groupLowestPrice(b) ?? Number.POSITIVE_INFINITY;
  const fallback = toMinutes(a.representative.departureTime) - toMinutes(b.representative.departureTime);
  if (sort === "price_asc") return aPrice - bPrice || fallback;
  if (sort === "price_desc") return bPrice - aPrice || fallback;
  if (sort === "depart_asc") return fallback;
  if (sort === "depart_desc") return -fallback;
  if (sort === "arrive_asc") return toMinutes(a.representative.arrivalTime) - toMinutes(b.representative.arrivalTime);
  if (sort === "duration_asc") return groupDurationMinutes(a) - groupDurationMinutes(b) || aPrice - bPrice;
  const direct = Number(b.representative.direct) - Number(a.representative.direct);
  const verified = Number(groupLowestVerifiedPrice(b) !== undefined) - Number(groupLowestVerifiedPrice(a) !== undefined);
  return direct || verified || aPrice - bPrice || groupDurationMinutes(a) - groupDurationMinutes(b) || fallback;
}

function normalizedAirline(value: string): string { return value?.trim() || UNKNOWN_AIRLINE; }
function priceOf(flight: FlightResult): number { return flight.totalPrice ?? flight.displayedPrice; }
function toMinutes(value: string): number {
  const formatted = displayFlightTime(value);
  if (formatted === "--:--") return 0;
  const [hour, minute] = formatted.split(":").map(Number);
  return hour * 60 + minute;
}
function inPeriod(time: string, period: ResultFilterState["departurePeriod"]): boolean {
  if (period === "all") return true;
  const hour = toMinutes(time) / 60;
  if (period === "morning") return hour < 12;
  if (period === "afternoon") return hour >= 12 && hour < 18;
  return hour >= 18;
}
