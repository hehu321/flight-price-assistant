import { FlightResult, SupportedPlatform } from "./flight";

export interface MatchedFlightGroup {
  id: string;
  representative: FlightResult;
  results: Partial<Record<SupportedPlatform, FlightResult[]>>;
  matchConfidence: number;
  matchReasons: string[];
  warnings: string[];
}

export interface ConfidenceScore {
  score: number; // 0-100
  level: "high" | "medium" | "low" | "invalid";
  passedRules: string[];
  failedRules: string[];
  warnings: string[];
}
