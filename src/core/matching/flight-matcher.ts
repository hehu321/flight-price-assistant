import { FlightResult, SupportedPlatform } from "@/shared/types/flight";
import { MatchedFlightGroup } from "@/shared/types/matching";
import { generateId } from "@/shared/utils/id-generator";

export function matchFlightsAcrossPlatforms(results: FlightResult[]): MatchedFlightGroup[] {
  const groups: MatchedFlightGroup[] = [];

  for (const flight of results) {
    let matchedGroup = groups.find((group) => isSameFlight(group.representative, flight));

    if (matchedGroup) {
      if (!matchedGroup.results[flight.platform]) {
        matchedGroup.results[flight.platform] = [];
      }
      matchedGroup.results[flight.platform]!.push(flight);
    } else {
      const newGroup: MatchedFlightGroup = {
        id: generateId("group"),
        representative: flight,
        results: {
          [flight.platform]: [flight],
        },
        matchConfidence: 95,
        matchReasons: ["航班号、出发日期及起降时间匹配"],
        warnings: [],
      };
      groups.push(newGroup);
    }
  }

  return groups;
}

export function isSameFlight(a: FlightResult, b: FlightResult): boolean {
  if (a.departureDate !== b.departureDate) return false;

  // 营销航班号或实际承运航班号一致
  const flightNumMatch =
    a.marketingFlightNumber === b.marketingFlightNumber ||
    (a.operatingFlightNumber && a.operatingFlightNumber === b.marketingFlightNumber) ||
    (b.operatingFlightNumber && a.marketingFlightNumber === b.operatingFlightNumber);

  if (flightNumMatch) return true;

  // 兼容起起飞时间有 5-10 分钟偏差的匹配（同航线、同航空公司、相同起降时间前后 10 分钟）
  if (
    a.airline === b.airline &&
    a.departureAirport === b.departureAirport &&
    a.arrivalAirport === b.arrivalAirport
  ) {
    const timeA = parseMinutes(a.departureTime);
    const timeB = parseMinutes(b.departureTime);
    if (Math.abs(timeA - timeB) <= 10) {
      return true;
    }
  }

  return false;
}

function parseMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
