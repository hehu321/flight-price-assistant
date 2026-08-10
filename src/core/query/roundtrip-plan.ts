import { FlightLeg, FlightQuery, SupportedPlatform } from "@/shared/types/flight";

export interface RoundTripLegQuery {
  leg: FlightLeg;
  query: FlightQuery;
}

/**
 * Produces the safe fallback only after a platform has no verified native
 * round-trip adapter. Each leg remains a normal, context-validated one-way
 * search rather than a guessed package fare.
 */
export function buildRoundTripLegQueries(query: FlightQuery): RoundTripLegQuery[] {
  if (query.tripType !== "roundtrip" || !query.returnDate) return [];
  return [
    { leg: "outbound", query: { ...query, tripType: "oneway", returnDate: undefined, departureDate: query.departureDate } },
    {
      leg: "inbound",
      query: {
        ...query,
        tripType: "oneway",
        returnDate: undefined,
        originCity: query.destinationCity,
        originCityCode: query.destinationCityCode,
        originAirport: query.destinationAirport,
        originAirportCode: query.destinationAirportCode,
        destinationCity: query.originCity,
        destinationCityCode: query.originCityCode,
        destinationAirport: query.originAirport,
        destinationAirportCode: query.originAirportCode,
        departureDate: query.returnDate,
      },
    },
  ];
}

export type NativeRoundTripAvailability = "verified" | "unavailable";
export interface RoundTripPlatformPlan {
  platform: SupportedPlatform;
  nativeAvailability: NativeRoundTripAvailability;
  fallbackReason?: string;
}

/** A platform must explicitly opt in after real-page flow verification. */
export function getRoundTripPlatformPlan(platform: SupportedPlatform): RoundTripPlatformPlan {
  if (platform === "ctrip") {
    return { platform, nativeAvailability: "verified" };
  }
  return {
    platform,
    nativeAvailability: "unavailable",
    fallbackReason: "该平台尚未验证可稳定读取的往返套餐流程，已改为去返程分段查询",
  };
}
