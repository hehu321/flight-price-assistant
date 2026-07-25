import { SupportedPlatform } from "@/shared/types/flight";

export const QUNAR_CONFIG = {
  id: "qunar" as SupportedPlatform,
  name: "去哪儿旅行",
  domains: ["qunar.com", "flight.qunar.com", "localhost:3002", "127.0.0.1:3002"],
  flightEntryUrl: "https://flight.qunar.com/",
};
