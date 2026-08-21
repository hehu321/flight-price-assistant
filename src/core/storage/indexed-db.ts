import { openDB, IDBPDatabase } from "idb";
import { LocalPriceRecord, FavoriteRoute, PriceWatch, PriceWatchEvent, QuerySnapshot } from "@/shared/types/storage";
import { AgentClient, AgentRun } from "@/shared/types/agent";
import { DiagnosticRecord } from "@/shared/types/diagnostic";

const DB_NAME = "FlightPriceAssistantDB";
const DB_VERSION = 6;

export interface FlightPriceDB {
  priceRecords: LocalPriceRecord;
  favoriteRoutes: FavoriteRoute;
  querySnapshots: QuerySnapshot;
  priceWatches: PriceWatch;
  priceWatchEvents: PriceWatchEvent;
  agentRuns: AgentRun;
  agentClients: AgentClient;
  diagnostics: DiagnosticRecord;
}

let dbPromise: Promise<IDBPDatabase<FlightPriceDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<FlightPriceDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FlightPriceDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains("priceRecords")) {
          const store = db.createObjectStore("priceRecords", { keyPath: "id" });
          store.createIndex("by_platform", "platform");
          store.createIndex("by_route", ["originCityCode", "destinationCityCode"]);
          store.createIndex("by_flightNumber", "flightNumber");
          store.createIndex("by_collectedAt", "collectedAt");
          store.createIndex("by_market", "market");
        } else {
          const store = transaction.objectStore("priceRecords");
          if (!store.indexNames.contains("by_market")) store.createIndex("by_market", "market");
        }
        if (!db.objectStoreNames.contains("favoriteRoutes")) {
          db.createObjectStore("favoriteRoutes", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("querySnapshots")) {
          const store = db.createObjectStore("querySnapshots", { keyPath: "id" });
          store.createIndex("by_journeyKey", "journeyKey");
          store.createIndex("by_updatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains("priceWatches")) {
          const store = db.createObjectStore("priceWatches", { keyPath: "id" });
          store.createIndex("by_journeyKey", "journeyKey");
        }
        if (!db.objectStoreNames.contains("priceWatchEvents")) {
          const store = db.createObjectStore("priceWatchEvents", { keyPath: "id" });
          store.createIndex("by_watchId", "watchId");
          store.createIndex("by_createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("agentRuns")) {
          const store = db.createObjectStore("agentRuns", { keyPath: "id" });
          store.createIndex("by_client_request", ["clientId", "requestId"], { unique: true });
          store.createIndex("by_updatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains("agentClients")) {
          const store = db.createObjectStore("agentClients", { keyPath: "id" });
          store.createIndex("by_status", "status");
        }
        if (!db.objectStoreNames.contains("diagnostics")) {
          const store = db.createObjectStore("diagnostics", { keyPath: "id" });
          store.createIndex("by_createdAt", "createdAt");
        }
      },
    });
  }
  return dbPromise;
}
