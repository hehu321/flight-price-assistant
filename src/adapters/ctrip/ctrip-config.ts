import { SupportedPlatform } from "@/shared/types/flight";

export const CTRIP_CONFIG = {
  id: "ctrip" as SupportedPlatform,
  name: "携程旅行",
  domains: ["ctrip.com", "flights.ctrip.com", "localhost:3001", "127.0.0.1:3001"],
  searchUrlTemplate: "https://flights.ctrip.com/online/list/oneway-{origin}-{destination}?depdate={date}",
};
