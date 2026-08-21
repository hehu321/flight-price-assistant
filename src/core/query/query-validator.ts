import { FlightQuery } from "@/shared/types/flight";
import { chinaDateString } from "@/shared/utils/china-date";
import { isInternationalQuery, queryLocationCode } from "./international-location-dictionary";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateFlightQuery(query: FlightQuery, now = new Date()): ValidationResult {
  const errors: string[] = [];

  if (!query.originCity || query.originCity.trim() === "") {
    errors.push("出发城市不能为空");
  }

  if (!query.destinationCity || query.destinationCity.trim() === "") {
    errors.push("到达城市不能为空");
  }

  if (isInternationalQuery(query)) {
    if (!/^[A-Z]{3}$/.test(queryLocationCode(query, "origin"))) errors.push("国际航线请从候选项中选择明确的出发城市、机场或 IATA 代码");
    if (!/^[A-Z]{3}$/.test(queryLocationCode(query, "destination"))) errors.push("国际航线请从候选项中选择明确的到达城市、机场或 IATA 代码");
  }

  if (
    query.originCity &&
    query.destinationCity &&
    query.originCity.trim() === query.destinationCity.trim()
  ) {
    errors.push("出发地与目的地不能相同");
  }

  const todayStr = chinaDateString(now);
  if (!query.departureDate) {
    errors.push("出发日期不能为空");
  } else if (query.departureDate < todayStr) {
    errors.push("出发日期不能早于当前日期");
  }

  if (query.tripType === "roundtrip") {
    if (!query.returnDate) {
      errors.push("往返行程必须填写返程日期");
    } else if (query.departureDate && query.returnDate < query.departureDate) {
      errors.push("返程日期不能早于出发日期");
    }
  }

  if (!query.adultCount || query.adultCount < 1) {
    errors.push("成人数量至少为1");
  }

  if (!query.enabledPlatforms || query.enabledPlatforms.length === 0) {
    errors.push("至少选择一个比价平台");
  }

  const validCabins = ["economy", "premium_economy", "business", "first"];
  if (!validCabins.includes(query.cabinClass)) {
    errors.push("舱位类型不合规");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
