import { FlightQuery } from "@/shared/types/flight";
import { SearchContextValidation } from "@/shared/types/platform";
import { normalizeCityName } from "@/core/query/city-normalizer";
import { queryLocationCode } from "@/core/query/international-location-dictionary";

export async function validateFliggyContext(query: FlightQuery): Promise<SearchContextValidation> {
  const matchedFields: string[] = [];
  const mismatchedFields: SearchContextValidation["mismatchedFields"] = [];

  const originNorm = normalizeCityName(query.originCity);
  const destNorm = normalizeCityName(query.destinationCity);

  const text = document.body ? document.body.innerText : "";
  const url = window.location.href;

  const hasOrigin = text.includes(originNorm) || url.toUpperCase().includes(queryLocationCode(query, "origin")) || url.includes(encodeURIComponent(query.originCity));
  const hasDest = text.includes(destNorm) || url.toUpperCase().includes(queryLocationCode(query, "destination")) || url.includes(encodeURIComponent(query.destinationCity));
  const hasDate = text.includes(query.departureDate) || url.includes(query.departureDate);

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
