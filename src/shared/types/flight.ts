export type SupportedPlatform = "ctrip" | "qunar" | "fliggy" | "tongcheng";

export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export type TripType = "oneway" | "roundtrip";
export type FlightLeg = "outbound" | "inbound";
export type RoundTripPricingMode = "native_package" | "split_fallback";
/** Identifies what a displayed price actually represents.  Never infer a
 * round-trip total from two independent one-way offers. */
export type FlightResultScope = "oneway" | "roundtrip_outbound" | "roundtrip_inbound" | "roundtrip_package";

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
  /** Present for a round-trip query so the two directions can never mix. */
  leg?: FlightLeg;
  /** A split fallback is not a platform round-trip package price. */
  roundTripPricingMode?: RoundTripPricingMode;
  /** Optional for records written by older releases. */
  resultScope?: Exclude<FlightResultScope, "roundtrip_package">;

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

/** A platform-disclosed round-trip option.  This is deliberately separate
 * from FlightResult so two one-way fares can never be presented as a package. */
export interface RoundTripFlightSegment {
  marketingFlightNumber: string;
  airline: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  direct: boolean;
  stopInfo?: string;
}

export interface RoundTripPackageResult {
  id: string;
  platform: SupportedPlatform;
  resultScope: "roundtrip_package";
  outbound: RoundTripFlightSegment;
  inbound: RoundTripFlightSegment;
  /** Price explicitly labelled by the platform as the round-trip total. */
  displayedTotalPrice: number;
  isStartingPrice: boolean;
  currency: "CNY";
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
