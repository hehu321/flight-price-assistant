import { FlightLeg, FlightQuery, RoundTripPackageResult, SupportedPlatform } from "./flight";

export type { SupportedPlatform };

export interface PlatformConfig {
  id: SupportedPlatform;
  name: string;
  enabled: boolean;
  domains: string[];
  flightEntryUrl: string;
  adapterId: string;
  openDelayMs: number;
}

export type PlatformTaskStatus =
  | "idle"
  | "creating_tab"
  | "opening"
  | "loading"
  | "login_required"
  | "captcha_required"
  | "sms_verification_required"
  | "filling_form"
  | "submitting_search"
  | "waiting_results"
  | "validating_context"
  | "extracting"
  | "verifying_price"
  | "completed"
  | "empty"
  | "rate_limited"
  | "page_timeout"
  | "interrupted"
  | "needs_user_action"
  | "page_changed"
  | "failed"
  | "cancelled";

export interface PlatformTaskState {
  platformId: SupportedPlatform;
  taskId: string;

  tabId?: number;
  status: PlatformTaskStatus;
  progress: number;
  message: string;

  errorCode?: string;
  retryable: boolean;

  resultCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonTask {
  id: string;
  query: FlightQuery;
  createdAt: string;
  updatedAt: string;

  platforms: Record<SupportedPlatform, PlatformTaskState>;
  /** Native packages only; split one-way results remain in the normal store. */
  roundTripPackages?: Partial<Record<SupportedPlatform, RoundTripPackageResult[]>>;
}

export interface PlatformTabBinding {
  taskId: string;
  platform: SupportedPlatform;
  leg?: FlightLeg;
  tabId: number;
  createdAt: string;
}

export type BlockingState =
  | "none"
  | "login_required"
  | "captcha"
  | "sms_verification"
  | "page_changed"
  | "unknown";

export interface BlockingDetectionResult {
  state: BlockingState;
  message: string;
  evidence: string[];
}

export interface SearchContextValidation {
  valid: boolean;
  matchedFields: string[];
  mismatchedFields: Array<{
    field: string;
    expected: string;
    actual: string;
  }>;
  confidence: number;
  errorCode?: string;
}

export interface AdapterDiagnosticReport {
  platformId: SupportedPlatform;
  currentUrl: string;
  matchedUrlPattern: boolean;
  pageType: "login" | "captcha" | "search_index" | "results" | "unknown";
  selectorsMatched: Record<string, boolean>;
  missingSelectors: string[];
  detectedFlightCardsCount: number;
  successfulPriceExtractionsCount: number;
  failedPriceExtractionsCount: number;
  contextValidationResult?: SearchContextValidation;
  adapterVersion: string;
  timestamp: string;
}
