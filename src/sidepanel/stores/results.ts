import { defineStore } from "pinia";
import { FlightResult, RoundTripPackageResult, SupportedPlatform } from "@/shared/types/flight";
import { MatchedFlightGroup } from "@/shared/types/matching";
import { matchFlightsAcrossPlatforms } from "@/core/matching/flight-matcher";

export const useResultsStore = defineStore("results", {
  state: () => ({
    rawResults: [] as FlightResult[],
    roundTripPackages: [] as RoundTripPackageResult[],
    hasUnseenResults: false,
  }),
  getters: {
    matchedGroups(): MatchedFlightGroup[] {
      return matchFlightsAcrossPlatforms(this.rawResults);
    },
    platformLowest(): Record<SupportedPlatform, number | null> {
      const res: Record<SupportedPlatform, number | null> = { ctrip: null, qunar: null, fliggy: null, tongcheng: null };
      for (const flight of this.rawResults) {
        const p = flight.platform;
        const total = flight.totalPrice ?? flight.displayedPrice;
        if (res[p] === null || total < res[p]!) {
          res[p] = total;
        }
      }
      return res;
    },
  },
  actions: {
    setResults(results: FlightResult[]) {
      this.rawResults = results;
      this.hasUnseenResults = results.length > 0;
    },
    setRoundTripPackages(packages: RoundTripPackageResult[]) {
      this.roundTripPackages = packages;
    },
    addPlatformPackages(platform: SupportedPlatform, packages: RoundTripPackageResult[]) {
      this.roundTripPackages = [...this.roundTripPackages.filter((item) => item.platform !== platform), ...packages];
      if (packages.length) this.hasUnseenResults = true;
    },
    addPlatformResults(platform: SupportedPlatform, results: FlightResult[]) {
      // 替换对应平台结果
      this.rawResults = [
        ...this.rawResults.filter((f) => f.platform !== platform),
        ...results,
      ];
      if (results.length) this.hasUnseenResults = true;
    },
    markResultsViewed() {
      this.hasUnseenResults = false;
    },
  },
});
