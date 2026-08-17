import { FlightLeg, FlightQuery, FlightResult, RoundTripPackageResult, SupportedPlatform } from "./flight";
import { PlatformTaskState, BlockingState, SearchContextValidation } from "./platform";

export type MessageType =
  | "START_COMPARISON"
  | "GET_CURRENT_SNAPSHOT"
  | "CANCEL_COMPARISON"
  | "RETRY_PLATFORM"
  | "RETRY_ROUNDTRIP_PACKAGE"
  | "OPEN_PLATFORM_LOGIN"
  | "GET_AGENT_INTEGRATION_STATUS"
  | "UPDATE_AGENT_CLIENT_STATUS"
  | "TASK_STATE_CHANGED"
  | "EXECUTE_ADAPTER"
  | "ADAPTER_COMPLETED"
  | "ADAPTER_PROGRESS"
  | "ADAPTER_PACKAGE_PROGRESS"
  | "ADAPTER_PACKAGE_COMPLETED"
  | "ADAPTER_FAILED"
  | "ADAPTER_EMPTY"
  | "BLOCKING_DETECTED"
  | "USER_ACTION_COMPLETED"
  | "RUN_DIAGNOSTICS"
  | "GET_DIAGNOSTICS"
  | "CLEAR_DIAGNOSTICS"
  | "DIAGNOSTICS_RESULT"
  | "OPEN_FLIGHT_BOOKING"
  | "BOOKING_PROGRESS";

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  taskId?: string;
  platform?: SupportedPlatform;
  payload?: T;
}

export interface StartComparisonPayload {
  query: FlightQuery;
}

export interface TaskStateChangedPayload {
  taskId: string;
  platform: SupportedPlatform;
  state: PlatformTaskState;
  results?: FlightResult[];
  packages?: RoundTripPackageResult[];
  packageState?: PlatformTaskState;
}

export interface AdapterPackageProgressPayload {
  taskId: string;
  platform: SupportedPlatform;
  packages: RoundTripPackageResult[];
  message: string;
}

export interface AdapterCompletedPayload {
  taskId: string;
  platform: SupportedPlatform;
  results: FlightResult[];
  validation: SearchContextValidation;
  leg?: FlightLeg;
}

export interface AdapterProgressPayload {
  taskId: string;
  platform: SupportedPlatform;
  results: FlightResult[];
  message: string;
  leg?: FlightLeg;
}

export interface AdapterFailedPayload {
  taskId: string;
  platform: SupportedPlatform;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
  collectionScope?: "package";
}

export interface BlockingDetectedPayload {
  taskId: string;
  platform: SupportedPlatform;
  state: BlockingState;
  message: string;
  collectionScope?: "package";
}

export type BookingActionStatus =
  | "opened"
  | "preparing"
  | "login_required"
  | "page_timeout"
  | "flight_changed"
  | "booking_not_confirmed"
  | "unsupported";

export interface BookingActionResult {
  status: BookingActionStatus;
  message: string;
  opened?: boolean;
}

export interface BookingProgressPayload {
  platform: SupportedPlatform;
  stage: "opening_result" | "waiting_result" | "locating_flight" | "opening_order";
  message: string;
}
