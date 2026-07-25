import { adapterRegistry } from "./base/adapter-registry";
import { CtripAdapter } from "./ctrip/ctrip-adapter";
import { QunarAdapter } from "./qunar/qunar-adapter";
import { FliggyAdapter } from "./fliggy/fliggy-adapter";
import { TongchengAdapter } from "./tongcheng/tongcheng-adapter";

export function registerAllAdapters(): void {
  adapterRegistry.register(new CtripAdapter());
  adapterRegistry.register(new QunarAdapter());
  adapterRegistry.register(new FliggyAdapter());
  adapterRegistry.register(new TongchengAdapter());
}
