import { SupportedPlatform } from "./flight";

/** Local, redacted troubleshooting event. No DOM, cookies, tokens or query
 * strings are persisted. */
export interface DiagnosticRecord {
  id: string;
  taskId?: string;
  platform?: SupportedPlatform;
  stage: "task" | "adapter" | "context" | "package" | "booking";
  level: "info" | "warning" | "error";
  code?: string;
  message: string;
  adapterVersion?: string;
  createdAt: string;
}
