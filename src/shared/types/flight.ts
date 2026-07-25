export type SupportedPlatform = "ctrip" | "qunar" | "fliggy" | "tongcheng";

export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export type TripType = "oneway" | "roundtrip";

export interface FlightQuery {
  tripType: TripType;

  originCity: string;
  originCityCode?: string;
  originAirport?: string;
  originAirportCode?: string;

  destinationCity: string;
  destinationCityCode?: string;
  destinationAirport?: string;
  destinationAirportCode?: string;

  departureDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD

  adultCount: number;
  childCount?: number;

  cabinClass: CabinClass;

  directOnly: boolean;

  enabledPlatforms: SupportedPlatform[];
}

export type FlightPriceType =
  | "public"
  | "member"
  | "coupon"
  | "new_user"
  | "student"
  | "child"
  | "unknown";

/** Whether the page explicitly disclosed the composition of the shown fare. */
export type PriceDisclosure = "base_only" | "total_only" | "breakdown";

export interface FlightResult {
  id: string;
  platform: SupportedPlatform;

  marketingFlightNumber: string;
  operatingFlightNumber?: string;
  airline: string;

  departureDate: string;
  departureTime: string; // HH:mm
  arrivalTime: string; // HH:mm
  arrivesNextDay: boolean;

  departureAirport: string;
  departureTerminal?: string;

  arrivalAirport: string;
  arrivalTerminal?: string;

  direct: boolean;
  stopInfo?: string;

  displayedPrice: number;
  /** 页面明确展示的机场建设费/民航发展基金（成人单人，单位：元） */
  airportConstructionFee?: number;
  /** 页面明确展示的燃油附加费（成人单人，单位：元） */
  fuelSurcharge?: number;
  taxAmount?: number;
  mandatoryFee?: number;
  totalPrice?: number;
  priceDisclosure?: PriceDisclosure;
  feeCollectedAt?: string;

  cabin?: string;
  baggage?: string;
  refundRule?: string;

  priceType: FlightPriceType;

  isStartingPrice: boolean;
  includesTax?: boolean;

  currency: "CNY";

  queryContextValid: boolean;
  confidence: number;

  collectedAt: string;
  sourceUrl: string;

  rawPriceText: string;
  warnings: string[];
}

export interface PlatformRawFlightResult {
  platform: SupportedPlatform;

  rawCardText: string;
  rawPriceText: string;
  rawFlightNumberText: string;
  rawRouteText: string;

  parsedResult?: FlightResult;

  warnings: string[];
}

export interface ParsedPrice {
  rawText: string;

  amount?: number;
  airportConstructionFee?: number;
  fuelSurcharge?: number;
  taxAmount?: number;
  mandatoryFee?: number;
  totalAmount?: number;

  currency: "CNY";

  isStartingPrice: boolean;
  includesTax?: boolean;
  priceDisclosure: PriceDisclosure;

  priceType: FlightPriceType;

  valid: boolean;
  warnings: string[];
}
