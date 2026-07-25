import { FlightResult } from "@/shared/types/flight";

export interface ConfidenceRule {
  id: string;
  name: string;
  weight: number;
  check: (flight: FlightResult) => boolean;
}

export const CONFIDENCE_RULES: ConfidenceRule[] = [
  {
    id: "query_context_valid",
    name: "查询上下文一致",
    weight: 20,
    check: (f) => f.queryContextValid,
  },
  {
    id: "marketing_flight_number",
    name: "航班号完整",
    weight: 15,
    check: (f) => !!f.marketingFlightNumber && f.marketingFlightNumber.length >= 3,
  },
  {
    id: "date_airport_complete",
    name: "日期和机场完整",
    weight: 15,
    check: (f) => !!f.departureDate && !!f.departureAirport && !!f.arrivalAirport,
  },
  {
    id: "price_parsed",
    name: "价格解析成功",
    weight: 15,
    check: (f) => typeof f.displayedPrice === "number" && f.displayedPrice > 0,
  },
  {
    id: "total_price_confirmed",
    name: "税费和总价确认",
    weight: 15,
    check: (f) => f.totalPrice !== undefined && f.totalPrice > 0,
  },
  {
    id: "price_type_clear",
    name: "价格类型明确",
    weight: 10,
    check: (f) => f.priceType !== "unknown",
  },
  {
    id: "result_stable",
    name: "连续两次读取稳定",
    weight: 5,
    check: (f) => !f.warnings.includes("提取不稳定"),
  },
  {
    id: "not_expired",
    name: "页面结果有效且未过期",
    weight: 5,
    check: (f) => !f.warnings.includes("结果可能已失效"),
  },
];
