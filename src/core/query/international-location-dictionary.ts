import { FlightLocation, FlightMarket, FlightQuery } from "@/shared/types/flight";

/**
 * A curated, offline airport/city index keeps the extension private and makes
 * an IATA selection deterministic.  Any valid three-letter IATA code can also
 * be selected explicitly, which covers airports not yet present in this
 * frequently-used-city index without guessing a Chinese city name.
 */
export const INTERNATIONAL_LOCATIONS: FlightLocation[] = [
  ["香港", "Hong Kong", "HKG", "香港", "Asia/Hong_Kong"], ["澳门", "Macao", "MFM", "澳门", "Asia/Macau"], ["台北", "Taipei", "TPE", "台湾", "Asia/Taipei"], ["高雄", "Kaohsiung", "KHH", "台湾", "Asia/Taipei"],
  ["东京", "Tokyo", "TYO", "日本", "Asia/Tokyo"], ["东京羽田机场", "Tokyo Haneda", "HND", "日本", "Asia/Tokyo", "airport"], ["东京成田机场", "Tokyo Narita", "NRT", "日本", "Asia/Tokyo", "airport"], ["大阪", "Osaka", "OSA", "日本", "Asia/Tokyo"], ["首尔", "Seoul", "SEL", "韩国", "Asia/Seoul"], ["新加坡", "Singapore", "SIN", "新加坡", "Asia/Singapore"],
  ["曼谷", "Bangkok", "BKK", "泰国", "Asia/Bangkok"], ["普吉", "Phuket", "HKT", "泰国", "Asia/Bangkok"], ["吉隆坡", "Kuala Lumpur", "KUL", "马来西亚", "Asia/Kuala_Lumpur"], ["雅加达", "Jakarta", "JKT", "印度尼西亚", "Asia/Jakarta"], ["巴厘岛", "Bali", "DPS", "印度尼西亚", "Asia/Makassar"], ["河内", "Hanoi", "HAN", "越南", "Asia/Ho_Chi_Minh"], ["胡志明市", "Ho Chi Minh City", "SGN", "越南", "Asia/Ho_Chi_Minh"], ["马尼拉", "Manila", "MNL", "菲律宾", "Asia/Manila"],
  ["悉尼", "Sydney", "SYD", "澳大利亚", "Australia/Sydney"], ["墨尔本", "Melbourne", "MEL", "澳大利亚", "Australia/Melbourne"], ["奥克兰", "Auckland", "AKL", "新西兰", "Pacific/Auckland"],
  ["伦敦", "London", "LON", "英国", "Europe/London"], ["巴黎", "Paris", "PAR", "法国", "Europe/Paris"], ["法兰克福", "Frankfurt", "FRA", "德国", "Europe/Berlin"], ["罗马", "Rome", "ROM", "意大利", "Europe/Rome"], ["阿姆斯特丹", "Amsterdam", "AMS", "荷兰", "Europe/Amsterdam"], ["马德里", "Madrid", "MAD", "西班牙", "Europe/Madrid"], ["莫斯科", "Moscow", "MOW", "俄罗斯", "Europe/Moscow"],
  ["纽约", "New York", "NYC", "美国", "America/New_York"], ["洛杉矶", "Los Angeles", "LAX", "美国", "America/Los_Angeles"], ["旧金山", "San Francisco", "SFO", "美国", "America/Los_Angeles"], ["西雅图", "Seattle", "SEA", "美国", "America/Los_Angeles"], ["芝加哥", "Chicago", "CHI", "美国", "America/Chicago"], ["温哥华", "Vancouver", "YVR", "加拿大", "America/Vancouver"], ["多伦多", "Toronto", "YTO", "加拿大", "America/Toronto"],
  ["迪拜", "Dubai", "DXB", "阿联酋", "Asia/Dubai"], ["多哈", "Doha", "DOH", "卡塔尔", "Asia/Qatar"], ["伊斯坦布尔", "Istanbul", "IST", "土耳其", "Europe/Istanbul"], ["开罗", "Cairo", "CAI", "埃及", "Africa/Cairo"], ["约翰内斯堡", "Johannesburg", "JNB", "南非", "Africa/Johannesburg"], ["德里", "Delhi", "DEL", "印度", "Asia/Kolkata"], ["孟买", "Mumbai", "BOM", "印度", "Asia/Kolkata"],
].map(([displayName, englishName, iataCode, countryOrRegion, timeZone, type]) => ({ displayName, englishName, iataCode, countryOrRegion, timeZone, type: type === "airport" ? "airport" : "city", market: "international_hmt" } as FlightLocation));

export function searchInternationalLocations(value: string): FlightLocation[] {
  const q = value.trim().toLowerCase();
  const matches = !q ? INTERNATIONAL_LOCATIONS : INTERNATIONAL_LOCATIONS.filter((item) => [item.displayName, item.englishName, item.iataCode, ...(item.aliases || [])].filter(Boolean).some((text) => text!.toLowerCase().includes(q)));
  if (/^[a-z]{3}$/i.test(value.trim()) && !matches.some((item) => item.iataCode === value.trim().toUpperCase())) {
    matches.push({ displayName: value.trim().toUpperCase(), iataCode: value.trim().toUpperCase(), type: "airport", countryOrRegion: "待确认", market: "international_hmt" });
  }
  return matches.slice(0, 20);
}

export function queryMarket(query: FlightQuery): FlightMarket {
  return query.market || query.originLocation?.market || query.destinationLocation?.market || "domestic";
}

export function isInternationalQuery(query: FlightQuery): boolean { return queryMarket(query) === "international_hmt"; }

export function queryLocationCode(query: FlightQuery, side: "origin" | "destination"): string {
  const location = side === "origin" ? query.originLocation : query.destinationLocation;
  const legacy = side === "origin" ? query.originCityCode : query.destinationCityCode;
  return (location?.iataCode || legacy || "").toUpperCase();
}
