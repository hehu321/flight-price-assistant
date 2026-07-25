import { PlatformAdapter } from "./platform-adapter";
import { SupportedPlatform } from "@/shared/types/flight";

class AdapterRegistry {
  private adapters: Map<SupportedPlatform, PlatformAdapter> = new Map();

  register(adapter: PlatformAdapter) {
    this.adapters.set(adapter.id, adapter);
  }

  getAdapter(id: SupportedPlatform): PlatformAdapter | undefined {
    return this.adapters.get(id);
  }

  findAdapterForUrl(url: string): PlatformAdapter | undefined {
    for (const adapter of this.adapters.values()) {
      if (adapter.matches(url)) {
        return adapter;
      }
    }
    return undefined;
  }
}

export const adapterRegistry = new AdapterRegistry();
