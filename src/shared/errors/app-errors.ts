import { AppError } from "../types/error";
import { SupportedPlatform } from "../types/flight";

export function createAppError(
  code: string,
  message: string,
  userMessage: string,
  retryable: boolean = false,
  platform?: SupportedPlatform,
  details?: Record<string, unknown>
): AppError {
  return {
    code,
    message,
    userMessage,
    retryable,
    platform,
    details,
  };
}

export const ErrorCodes = {
  INVALID_QUERY: "INVALID_QUERY",
  TAB_CREATE_FAILED: "TAB_CREATE_FAILED",
  PAGE_LOAD_TIMEOUT: "PAGE_LOAD_TIMEOUT",
  LOGIN_REQUIRED: "LOGIN_REQUIRED",
  CAPTCHA_REQUIRED: "CAPTCHA_REQUIRED",
  CONTEXT_MISMATCH: "CONTEXT_MISMATCH",
  EXTRACTION_FAILED: "EXTRACTION_FAILED",
  STORAGE_ERROR: "STORAGE_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};
