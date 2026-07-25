import { FlightQuery, FlightResult, SupportedPlatform } from "./flight";
import { PlatformTaskState, PlatformTaskStatus, BlockingState, SearchContextValidation, AdapterDiagnosticReport } from "./platform";

export type MessageType =
  | "START_COMPARISON"
  | "GET_CURRENT_SNAPSHOT"
  | "CANCEL_COMPARISON"
  | "RETRY_PLATFORM"
  | "OPEN_PLATFORM_LOGIN"
  | "GET_AGENT_INTEGRATION_STATUS"
  | "UPDATE_AGENT_CLIENT_STATUS"
  | "TASK_STATE_CHANGED"
  | "EXECUTE_ADAPTER"
  | "ADAPTER_COMPLETED"
  | "ADAPTER_PROGRESS"
  | "ADAPTER_FAILED"
  | "ADAPTER_EMPTY"
  | "BLOCKING_DETECTED"
  | "USER_ACTION_COMPLETED"
  | "RUN_DIAGNOSTICS"
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
}

export interface AdapterCompletedPayload {
  taskId: string;
  platform: SupportedPlatform;
  results: FlightResult[];
  validation: SearchContextValidation;
}

export interface AdapterProgressPayload {
  taskId: string;
  platform: SupportedPlatform;
  results: FlightResult[];
  message: string;
}

export interface AdapterFailedPayload {
  taskId: string;
  platform: SupportedPlatform;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface BlockingDetectedPayload {
  taskId: string;
  platform: SupportedPlatform;
  state: BlockingState;
  message: string;
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
