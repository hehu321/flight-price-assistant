import { normalizeCityName } from "@/core/query/city-normalizer";
import { FlightQuery } from "@/shared/types/flight";
import { SearchContextValidation } from "@/shared/types/platform";

export async function validateTongchengContext(query: FlightQuery): Promise<SearchContextValidation> {
  const matchedFields: string[] = [];
  const mismatchedFields: SearchContextValidation["mismatchedFields"] = [];
  const text = document.body?.innerText || "";
  const url = window.location.href;
  const originCode = (query.originCityCode || "").toUpperCase();
  const destinationCode = (query.destinationCityCode || "").toUpperCase();

  const hasOrigin = text.includes(normalizeCityName(query.originCity)) || (originCode.length === 3 && url.includes(originCode));
  const hasDestination = text.includes(normalizeCityName(query.destinationCity)) || (destinationCode.length === 3 && url.includes(destinationCode));
  const hasDate = text.includes(query.departureDate) || url.includes(query.departureDate);

  if (hasOrigin) matchedFields.push("origin");
  else mismatchedFields.push({ field: "origin", expected: query.originCity, actual: "未检测到" });
  if (hasDestination) matchedFields.push("destination");
  else mismatchedFields.push({ field: "destination", expected: query.destinationCity, actual: "未检测到" });
  if (hasDate) matchedFields.push("departureDate");
  else mismatchedFields.push({ field: "departureDate", expected: query.departureDate, actual: "未检测到" });

  const valid = mismatchedFields.length === 0;
  return { valid, matchedFields, mismatchedFields, confidence: valid ? 100 : 0, errorCode: valid ? undefined : "SEARCH_CONTEXT_MISMATCH" };
}
