import { FlightQuery, FlightResult, SupportedPlatform } from "./flight";
import { PlatformTaskState } from "./platform";

export type AgentRunStatus =
  | "queued"
  | "running"
  | "needs_user_action"
  | "completed"
  | "partial"
  | "failed"
  | "cancelled"
  | "expired";

export type AgentClientStatus = "pending" | "approved" | "rejected" | "revoked";

export interface AgentClient {
  id: string;
  name: string;
  version?: string;
  status: AgentClientStatus;
  firstRequestedAt: string;
  updatedAt: string;
}

export interface AgentRun {
  id: string;
  clientId: string;
  requestId: string;
  source: "agent" | "manual" | "monitor";
  monitorWatchId?: string;
  query: FlightQuery;
  timeoutSeconds: number;
  status: AgentRunStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt: string;
  queuePosition?: number;
  platformStates: Record<SupportedPlatform, PlatformTaskState>;
  results: Record<SupportedPlatform, FlightResult[]>;
  warnings: string[];
}

export interface AgentSearchRequest {
  requestId?: string;
  tripType?: FlightQuery["tripType"];
  originCity: string;
  originCityCode?: string;
  originAirport?: string;
  originAirportCode?: string;
  destinationCity: string;
  destinationCityCode?: string;
  destinationAirport?: string;
  destinationAirportCode?: string;
  departureDate: string;
  returnDate?: string;
  adultCount?: number;
  childCount?: number;
  cabinClass?: FlightQuery["cabinClass"];
  directOnly?: boolean;
  enabledPlatforms?: SupportedPlatform[];
  timeoutSeconds?: number;
}

export interface AgentClientIdentity {
  id: string;
  name: string;
  version?: string;
}

export interface AgentPublicFlight {
  id: string;
  platform: SupportedPlatform;
  marketingFlightNumber: string;
  operatingFlightNumber?: string;
  airline: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  arrivesNextDay: boolean;
  departureAirport: string;
  departureTerminal?: string;
  arrivalAirport: string;
  arrivalTerminal?: string;
  direct: boolean;
  stopInfo?: string;
  displayedPrice: number;
  airportConstructionFee?: number;
  fuelSurcharge?: number;
  taxAmount?: number;
  totalPrice?: number;
  priceDisclosure?: FlightResult["priceDisclosure"];
  priceType: FlightResult["priceType"];
  isStartingPrice: boolean;
  includesTax?: boolean;
  currency: "CNY";
  confidence: number;
  collectedAt: string;
  resultPageUrl: string;
  warnings: string[];
}

export interface AgentRunResponse {
  runId: string;
  status: AgentRunStatus;
  version: number;
  changed: boolean;
  isFinal: boolean;
  queuePosition?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  freshness: "fresh" | "stale";
  progress: number;
  lowestComparablePrice?: number;
  /** Lowest displayed ticket fare; it may exclude required fees and is not a comparable total. */
  lowestDisplayedPrice?: number;
  platforms: Record<SupportedPlatform, Pick<PlatformTaskState, "status" | "progress" | "message" | "resultCount" | "errorCode" | "retryable" | "updatedAt">>;
  flights: AgentPublicFlight[];
  warnings: string[];
}

export interface NativeBridgeRequest {
  protocolVersion: 1;
  id: string;
  type: "request";
  client: AgentClientIdentity;
  method: "get_flight_agent_status" | "search_flights" | "get_flight_search_result" | "retry_flight_platform" | "resume_flight_search" | "cancel_flight_search";
  params?: Record<string, unknown>;
}

export interface NativeBridgeResponse {
  protocolVersion: 1;
  id: string;
  type: "response";
  ok: boolean;
  result?: unknown;
  error?: { code: string; message: string; retryable?: boolean; details?: Record<string, unknown> };
}
