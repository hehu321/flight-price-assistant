import { FlightPriceType, FlightQuery, FlightResult, SupportedPlatform } from "./flight";
import { PlatformTaskState } from "./platform";

export interface LocalPriceRecord {
  id: string;
  taskId: string;

  platform: SupportedPlatform;

  originCityCode: string;
  originAirportCode?: string;

  destinationCityCode: string;
  destinationAirportCode?: string;

  departureDate: string;

  flightNumber: string;
  operatingFlightNumber?: string;

  displayedPrice: number;
  airportConstructionFee?: number;
  fuelSurcharge?: number;
  taxAmount?: number;
  totalPrice?: number;
  priceDisclosure?: FlightResult["priceDisclosure"];

  priceType: FlightPriceType;

  confidence: number;

  collectedAt: string;

  /** 新数据用于精确历史筛选；旧版本记录没有这些字段。 */
  querySnapshotId?: string;
  airline?: string;
  departureTime?: string;
  arrivalTime?: string;
  direct?: boolean;
  dataQuality?: "verified" | "partial" | "legacy";
}

export interface QuerySnapshot {
  id: string;
  taskId: string;
  journeyKey: string;
  query: FlightQuery;
  createdAt: string;
  updatedAt: string;
  platforms: Record<SupportedPlatform, Pick<PlatformTaskState, "status" | "message" | "resultCount" | "errorCode" | "updatedAt">>;
  results: Record<SupportedPlatform, FlightResult[]>;
}

export interface CityAirportMapping {
  cityName: string;
  cityCode: string;
  /** 同一机场实际服务的周边城市、行政区简称等输入别名。 */
  aliases?: string[];
  airports: Array<{
    airportName: string;
    airportCode: string;
  }>;
}

export interface FavoriteRoute {
  id: string;
  originCity: string;
  originCityCode: string;
  destinationCity: string;
  destinationCityCode: string;
  createdAt: string;
}

/** 用户主动关注的单次行程；提醒仅基于下一次实际查询，不会后台伪造实时价格。 */
export interface PriceWatch {
  id: string;
  journeyKey: string;
  originCity: string;
  originCityCode?: string;
  destinationCity: string;
  destinationCityCode?: string;
  departureDate: string;
  /** Optional: monitoring can still alert on a meaningful price drop without a target. */
  targetPrice?: number;
  enabledPlatforms: SupportedPlatform[];
  /** Preserve the exact user-selected conditions for later background checks. */
  query?: FlightQuery;
  monitorEnabled?: boolean;
  intervalMinutes?: number;
  nextRunAt?: string;
  lastRunAt?: string;
  lastSuccessfulPrice?: number;
  lastOutcome?: "scheduled" | "completed" | "partial" | "blocked" | "failed" | "deferred";
  lastError?: string;
  targetReached?: boolean;
  lastNotifiedAt?: string;
  lastNotifiedPrice?: number;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
}

export type PriceWatchEventType = "target_reached" | "price_drop" | "blocked" | "failed";

export interface PriceWatchEvent {
  id: string;
  watchId: string;
  journeyKey: string;
  type: PriceWatchEventType;
  message: string;
  price?: number;
  platformCount?: number;
  createdAt: string;
}
