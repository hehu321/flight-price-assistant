import { FlightQuery } from "@/shared/types/flight";
import { SearchContextValidation } from "@/shared/types/platform";
import { normalizeCityName } from "@/core/query/city-normalizer";

export async function validateCtripContext(query: FlightQuery): Promise<SearchContextValidation> {
  const url = window.location.href;
  const matchedFields: string[] = [];
  const mismatchedFields: SearchContextValidation["mismatchedFields"] = [];

  const originNorm = normalizeCityName(query.originCity);
  const destNorm = normalizeCityName(query.destinationCity);

  // 从 URL 或 DOM 节点获取校验证据
  const urlUpper = url.toUpperCase();
  const hasOrigin = urlUpper.includes(query.originCityCode || "WUH") || document.body.innerText.includes(originNorm);
  const hasDest = urlUpper.includes(query.destinationCityCode || "BJS") || document.body.innerText.includes(destNorm);
  const hasDate = url.includes(query.departureDate) || document.body.innerText.includes(query.departureDate);

  if (hasOrigin) matchedFields.push("origin");
  else mismatchedFields.push({ field: "origin", expected: query.originCity, actual: "未检测到" });

  if (hasDest) matchedFields.push("destination");
  else mismatchedFields.push({ field: "destination", expected: query.destinationCity, actual: "未检测到" });

  if (hasDate) matchedFields.push("departureDate");
  else mismatchedFields.push({ field: "departureDate", expected: query.departureDate, actual: "未检测到" });

  const valid = mismatchedFields.length === 0;

  return {
    valid,
    matchedFields,
    mismatchedFields,
    confidence: valid ? 100 : 0,
    errorCode: valid ? undefined : "SEARCH_CONTEXT_MISMATCH",
  };
}
