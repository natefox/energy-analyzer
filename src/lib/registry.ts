import type { UtilityPlugin } from "./types";
import { sdgePlugin } from "@/plugins/sdge";
import { scePlugin } from "@/plugins/sce";

const plugins: UtilityPlugin[] = [sdgePlugin, scePlugin];

export function getPlugins(): UtilityPlugin[] {
  return plugins;
}

export function getPlugin(id: string): UtilityPlugin | undefined {
  return plugins.find((p) => p.id === id);
}

export function detectUtility(csvText: string): UtilityPlugin | undefined {
  return plugins.find((p) => p.detectCsv(csvText));
}
