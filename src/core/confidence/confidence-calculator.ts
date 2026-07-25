import { FlightResult } from "@/shared/types/flight";
import { ConfidenceScore } from "@/shared/types/matching";
import { CONFIDENCE_RULES } from "./confidence-rules";

export function calculateConfidence(flight: FlightResult): ConfidenceScore {
  if (!flight.queryContextValid) {
    return {
      score: 0,
      level: "invalid",
      passedRules: [],
      failedRules: ["query_context_mismatch"],
      warnings: ["页面上下文与查询条件不匹配"],
    };
  }

  let totalScore = 0;
  const passedRules: string[] = [];
  const failedRules: string[] = [];

  for (const rule of CONFIDENCE_RULES) {
    if (rule.check(flight)) {
      totalScore += rule.weight;
      passedRules.push(rule.name);
    } else {
      failedRules.push(rule.name);
    }
  }

  totalScore = Math.min(100, Math.max(0, totalScore));

  let level: ConfidenceScore["level"] = "low";
  if (totalScore >= 85) {
    level = "high";
  } else if (totalScore >= 70) {
    level = "medium";
  }

  return {
    score: totalScore,
    level,
    passedRules,
    failedRules,
    warnings: flight.warnings || [],
  };
}
