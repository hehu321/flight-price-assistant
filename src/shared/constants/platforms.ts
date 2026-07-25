import { PlatformConfig } from "../types/platform";

export const platformConfigs: PlatformConfig[] = [
  {
    id: "ctrip",
    name: "携程旅行",
    enabled: true,
    domains: ["ctrip.com", "flights.ctrip.com", "localhost:3001", "127.0.0.1:3001"],
    flightEntryUrl: "https://flights.ctrip.com/",
    adapterId: "ctrip-adapter",
    openDelayMs: 0,
  },
  {
    id: "qunar",
    name: "去哪儿旅行",
    enabled: true,
    domains: ["qunar.com", "flight.qunar.com", "localhost:3002", "127.0.0.1:3002"],
    flightEntryUrl: "https://flight.qunar.com/",
    adapterId: "qunar-adapter",
    openDelayMs: 700,
  },
  {
    id: "fliggy",
    name: "飞猪旅行",
    enabled: true,
    domains: ["fliggy.com", "www.fliggy.com", "localhost:3003", "127.0.0.1:3003"],
    flightEntryUrl: "https://www.fliggy.com/jipiao/",
    adapterId: "fliggy-adapter",
    openDelayMs: 1400,
  },
  {
    id: "tongcheng",
    name: "同程旅行",
    enabled: true,
    domains: ["ly.com", "www.ly.com", "localhost:3004", "127.0.0.1:3004"],
    flightEntryUrl: "https://www.ly.com/flights/home",
    adapterId: "tongcheng-adapter",
    openDelayMs: 2100,
  },
];
