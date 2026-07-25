import { SupportedPlatform } from "./flight";

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  platform?: SupportedPlatform;
  details?: Record<string, unknown>;
}
