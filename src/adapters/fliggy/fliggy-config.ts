import { SupportedPlatform } from "@/shared/types/flight";

export const FLIGGY_CONFIG = {
  id: "fliggy" as SupportedPlatform,
  name: "飞猪旅行",
  domains: ["fliggy.com", "www.fliggy.com", "localhost:3003", "127.0.0.1:3003"],
  flightEntryUrl: "https://www.fliggy.com/jipiao/",
};
