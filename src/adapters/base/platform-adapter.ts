import {
  FlightQuery,
  FlightResult,
  PlatformRawFlightResult,
  SupportedPlatform,
} from "@/shared/types/flight";
import {
  AdapterDiagnosticReport,
  BlockingState,
  SearchContextValidation,
} from "@/shared/types/platform";

export interface PlatformAdapter {
  id: SupportedPlatform;
  name: string;

  matches(url: string): boolean;

  buildSearchUrl(query: FlightQuery): string | null;

  /** Return a clear, terminal state for routes a platform does not offer. */
  supportsQuery?(query: FlightQuery): { supported: boolean; message?: string };

  fillSearchForm?(query: FlightQuery): Promise<void>;

  shouldSubmitSearch?(query: FlightQuery): boolean;

  submitSearch?(): Promise<void>;

  detectBlockingState(): Promise<BlockingState>;

  waitForResults(): Promise<void>;

  /**
   * Some result pages append flights only after the user reaches lower parts of
   * the document.  Adapters can finish that collection phase before parsing.
   */
  prepareForExtraction?(): Promise<void>;

  /** Streams parsed results while a progressively rendered page is loading. */
  collectIncrementally?(
    onUpdate: (results: FlightResult[], message: string) => Promise<void> | void
  ): Promise<PlatformRawFlightResult[]>;

  /** Opens the platform's own booking/flight-detail control for a result. */
  openBooking?(flight: FlightResult): Promise<boolean>;

  validateSearchContext(query: FlightQuery): Promise<SearchContextValidation>;

  extractFlights(): Promise<PlatformRawFlightResult[]>;

  verifyPrice?(flight: FlightResult): Promise<FlightResult>;

  diagnose(): Promise<AdapterDiagnosticReport>;
}
