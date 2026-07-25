import { FlightResult, SupportedPlatform } from "@/shared/types/flight";
import { QuerySnapshot } from "@/shared/types/storage";
import { journeyLabel } from "./journey-key";
import { verifiedTotalPrice } from "@/core/results/fare-presentation";

const PLATFORMS: SupportedPlatform[] = ["ctrip", "qunar", "fliggy", "tongcheng"];

export interface JourneySummary {
  journeyKey: string;
  label: string;
  latest: QuerySnapshot;
  snapshots: QuerySnapshot[];
  historicalLow?: number;
  historicalMedian?: number;
  sampleCount: number;
  latestLowest?: number;
  previousLowest?: number;
  latestDelta?: number;
  departureState: "upcoming" | "expired";
  successfulPlatforms: number;
}

export interface TrendPoint { label: string; price: number; snapshotId: string; collectedAt: string; }

export interface FlightPriceMatrixRow {
  key: string;
  flightNumber: string;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  direct: boolean;
  prices: Partial<Record<SupportedPlatform, FlightResult>>;
  lowestPrice: number;
  highestPrice: number;
  saving: number;
}

export interface SnapshotComparison {
  platformChanges: Array<{ platform: SupportedPlatform; previous?: number; current?: number; delta?: number }>;
  flightChanges: Array<{ key: string; label: string; previous?: number; current?: number; delta?: number }>;
}

export interface AlternativeRecommendation {
  kind: "direct" | "airport" | "time";
  title: string;
  detail: string;
  price: number;
  saving?: number;
}

export function buildJourneySummaries(snapshots: QuerySnapshot[]): JourneySummary[] {
  const grouped = new Map<string, QuerySnapshot[]>();
  for (const snapshot of snapshots) {
    const list = grouped.get(snapshot.journeyKey) || [];
    list.push(snapshot);
    grouped.set(snapshot.journeyKey, list);
  }
  return [...grouped.entries()].map(([journeyKey, list]) => {
    const sorted = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const prices = sorted.map(snapshotLowest).filter((price): price is number => price !== undefined).sort((a, b) => a - b);
    const latestLowest = snapshotLowest(sorted[0]);
    const previousLowest = sorted[1] ? snapshotLowest(sorted[1]) : undefined;
    const departureState: JourneySummary["departureState"] = sorted[0].query.departureDate >= new Date().toISOString().slice(0, 10) ? "upcoming" : "expired";
    return {
      journeyKey,
      label: journeyLabel(sorted[0].query),
      latest: sorted[0],
      snapshots: sorted,
      historicalLow: prices[0],
      historicalMedian: median(prices),
      sampleCount: prices.length,
      latestLowest,
      previousLowest,
      latestDelta: latestLowest !== undefined && previousLowest !== undefined ? latestLowest - previousLowest : undefined,
      departureState,
      successfulPlatforms: PLATFORMS.filter((platform) => ["completed", "empty"].includes(sorted[0].platforms[platform].status)).length,
    };
  }).sort((a, b) => b.latest.updatedAt.localeCompare(a.latest.updatedAt));
}

export function buildTrendPoints(snapshots: QuerySnapshot[]): TrendPoint[] {
  return [...snapshots].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)).flatMap((snapshot) => {
    const price = snapshotLowest(snapshot);
    return price === undefined ? [] : [{
      label: new Date(snapshot.updatedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
      price,
      snapshotId: snapshot.id,
      collectedAt: snapshot.updatedAt,
    }];
  });
}

export function buildFlightPriceMatrix(snapshot: QuerySnapshot): FlightPriceMatrixRow[] {
  const grouped = new Map<string, FlightResult[]>();
  for (const flight of comparableFlights(snapshot)) {
    const key = flightKey(flight);
    const list = grouped.get(key) || [];
    list.push(flight);
    grouped.set(key, list);
  }
  return [...grouped.entries()].map(([key, flights]) => {
    const representative = flights[0];
    const prices: Partial<Record<SupportedPlatform, FlightResult>> = {};
    for (const platform of PLATFORMS) {
      const candidates = flights.filter((flight) => flight.platform === platform).sort((a, b) => priceOf(a) - priceOf(b));
      if (candidates[0]) prices[platform] = candidates[0];
    }
    const values = Object.values(prices).map(priceOf);
    const lowestPrice = Math.min(...values);
    const highestPrice = Math.max(...values);
    return {
      key,
      flightNumber: hasStableFlightNumber(representative) ? representative.marketingFlightNumber : "航班号待确认",
      airline: representative.airline,
      departureTime: representative.departureTime,
      arrivalTime: representative.arrivalTime,
      departureAirport: representative.departureAirport,
      arrivalAirport: representative.arrivalAirport,
      direct: representative.direct,
      prices,
      lowestPrice,
      highestPrice,
      saving: highestPrice - lowestPrice,
    };
  }).sort((a, b) => a.lowestPrice - b.lowestPrice);
}

export function compareSnapshots(previous: QuerySnapshot, current: QuerySnapshot): SnapshotComparison {
  const platformChanges = PLATFORMS.map((platform) => {
    const before = platformLowest(previous, platform);
    const after = platformLowest(current, platform);
    return { platform, previous: before, current: after, delta: before !== undefined && after !== undefined ? after - before : undefined };
  });
  const previousRows = new Map(buildFlightPriceMatrix(previous).map((row) => [row.key, row]));
  const currentRows = new Map(buildFlightPriceMatrix(current).map((row) => [row.key, row]));
  const keys = new Set([...previousRows.keys(), ...currentRows.keys()]);
  const flightChanges = [...keys].map((key) => {
    const before = previousRows.get(key);
    const after = currentRows.get(key);
    const previousPrice = before?.lowestPrice;
    const currentPrice = after?.lowestPrice;
    const row = after || before!;
    return {
      key,
      label: `${row.flightNumber} · ${row.departureTime}→${row.arrivalTime}`,
      previous: previousPrice,
      current: currentPrice,
      delta: previousPrice !== undefined && currentPrice !== undefined ? currentPrice - previousPrice : undefined,
    };
  }).sort((a, b) => Math.abs(b.delta || 0) - Math.abs(a.delta || 0)).slice(0, 8);
  return { platformChanges, flightChanges };
}

export function buildAlternatives(snapshot: QuerySnapshot): AlternativeRecommendation[] {
  const flights = comparableFlights(snapshot);
  if (!flights.length) return [];
  const lowest = Math.min(...flights.map(priceOf));
  const direct = flights.filter((flight) => flight.direct).sort((a, b) => priceOf(a) - priceOf(b))[0];
  const recommendations: AlternativeRecommendation[] = [];
  if (direct) {
    recommendations.push({
      kind: "direct",
      title: `最省的直飞：${direct.marketingFlightNumber || direct.airline}`,
      detail: `${direct.departureTime} → ${direct.arrivalTime} · ${direct.departureAirport} → ${direct.arrivalAirport}`,
      price: priceOf(direct),
      saving: priceOf(direct) - lowest,
    });
  }
  const airports = new Map<string, FlightResult>();
  for (const flight of flights.filter((item) => item.direct)) {
    const old = airports.get(flight.arrivalAirport);
    if (!old || priceOf(flight) < priceOf(old)) airports.set(flight.arrivalAirport, flight);
  }
  const airportChoices = [...airports.values()].sort((a, b) => priceOf(a) - priceOf(b));
  if (airportChoices.length > 1) {
    const best = airportChoices[0];
    const costly = airportChoices[airportChoices.length - 1];
    recommendations.push({
      kind: "airport",
      title: `到达 ${best.arrivalAirport} 更划算`,
      detail: `相比 ${costly.arrivalAirport} 的最省直飞价，可少付 ¥${priceOf(costly) - priceOf(best)}`,
      price: priceOf(best),
      saving: priceOf(costly) - priceOf(best),
    });
  }
  const early = flights.filter((item) => item.direct && item.departureTime < "10:00").sort((a, b) => priceOf(a) - priceOf(b))[0];
  const late = flights.filter((item) => item.direct && item.departureTime >= "18:00").sort((a, b) => priceOf(a) - priceOf(b))[0];
  const alternative = [early, late].filter((flight): flight is FlightResult => Boolean(flight)).sort((a, b) => priceOf(a) - priceOf(b))[0];
  if (alternative && (!direct || flightKey(alternative) !== flightKey(direct))) {
    recommendations.push({
      kind: "time",
      title: `${alternative.departureTime} 起飞的直飞替代`,
      detail: `${alternative.airline} ${alternative.marketingFlightNumber} · ${alternative.departureAirport} → ${alternative.arrivalAirport}`,
      price: priceOf(alternative),
      saving: priceOf(alternative) - lowest,
    });
  }
  return recommendations;
}

export function snapshotLowest(snapshot: QuerySnapshot): number | undefined {
  const prices = comparableFlights(snapshot).map(priceOf);
  return prices.length ? Math.min(...prices) : undefined;
}

export function platformLowest(snapshot: QuerySnapshot, platform: SupportedPlatform): number | undefined {
  const prices = snapshot.results[platform].filter(isComparableFlight).map(priceOf);
  return prices.length ? Math.min(...prices) : undefined;
}

function comparableFlights(snapshot: QuerySnapshot): FlightResult[] {
  return Object.values(snapshot.results).flat().filter(isComparableFlight);
}

function isComparableFlight(flight: FlightResult): boolean {
  const total = verifiedTotalPrice(flight);
  return flight.queryContextValid && flight.confidence >= 70 && total !== undefined && Number.isFinite(total) && total > 0;
}

function priceOf(flight: FlightResult): number { return verifiedTotalPrice(flight)!; }

function hasStableFlightNumber(flight: FlightResult): boolean {
  return /^[A-Z0-9]{2}\d{3,4}$/i.test(flight.marketingFlightNumber);
}

function flightKey(flight: FlightResult): string {
  const number = hasStableFlightNumber(flight) ? flight.marketingFlightNumber.toUpperCase() : flight.airline;
  return `${number}|${flight.departureDate}|${flight.departureTime}|${flight.arrivalTime}|${flight.departureAirport}|${flight.arrivalAirport}`;
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : Math.round((values[middle - 1] + values[middle]) / 2);
}
