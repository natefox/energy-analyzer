"use client";

import { useState, useMemo } from "react";
import type { IntervalRecord, NemTier, UtilityPlugin } from "@/lib/types";
import { getPlugins } from "@/lib/registry";
import CsvUploader from "@/components/CsvUploader";
import UsageDashboard from "@/components/UsageDashboard";
import { calculateCosts } from "@/lib/calculator";

const NEM_OPTIONS: { value: NemTier; label: string; description: string }[] = [
  { value: "none", label: "No Solar / No NEM", description: "Standard billing without solar export credits" },
  { value: "NEM1", label: "NEM 1.0", description: "Full retail rate credit for exports (legacy, grandfathered)" },
  { value: "NEM2", label: "NEM 2.0", description: "Retail rate minus non-bypassable charges (~$0.02-0.03/kWh less)" },
  { value: "NEM3", label: "NEM 3.0 (Net Billing)", description: "Time-varying avoided cost export rates (significantly lower)" },
];

export default function AnalyzePage() {
  const plugins = getPlugins();
  const [records, setRecords] = useState<IntervalRecord[] | null>(null);
  const [plugin, setPlugin] = useState<UtilityPlugin | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [nemTier, setNemTier] = useState<NemTier>("none");

  const handleDataLoaded = (newRecords: IntervalRecord[], detectedPlugin: UtilityPlugin) => {
    setRecords(newRecords);
    setPlugin(detectedPlugin);
    setSelectedPlanId(detectedPlugin.defaultPlanId);
    // Auto-detect solar: if any generation data, suggest NEM
    const hasSolar = newRecords.some((r) => r.generation > 0);
    if (hasSolar && nemTier === "none") {
      setNemTier("NEM2"); // Default to NEM2 for solar users (most common active tier)
    }
  };

  const selectedPlan = plugin?.plans.find((p) => p.id === selectedPlanId);
  const hasSolar = records?.some((r) => r.generation > 0) ?? false;

  const result = useMemo(() => {
    if (!records || !selectedPlan || !plugin) return null;
    return calculateCosts(records, selectedPlan, plugin, nemTier);
  }, [records, selectedPlan, plugin, nemTier]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analyze Your Energy Usage</h1>
        <p className="text-gray-600 mt-1">Upload your utility CSV file to see detailed usage and cost breakdowns</p>
      </div>
      <details className="bg-white rounded-xl p-6 shadow-sm border">
        <summary className="cursor-pointer font-medium text-gray-700">How to download your usage data</summary>
        <div className="mt-4 space-y-6">
          {plugins.map((p) => (
            <div key={p.id}>
              <h3 className="font-semibold text-gray-800">{p.name}</h3>
              <ol className="mt-2 list-decimal list-inside text-sm text-gray-600 space-y-1">
                {p.downloadInstructions.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
              <a href={p.downloadUrl} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-2 text-sm text-emerald-600 hover:underline">
                Go to {p.shortName} My Account &rarr;
              </a>
            </div>
          ))}
        </div>
      </details>
      <CsvUploader onDataLoaded={handleDataLoaded} />
      {plugin && (
        <div className="bg-white rounded-xl p-4 shadow-sm border flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Rate Plan:</label>
            <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm">
              {plugin.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {hasSolar && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">NEM Tier:</label>
              <select value={nemTier} onChange={(e) => setNemTier(e.target.value as NemTier)}
                className="border rounded-lg px-3 py-1.5 text-sm">
                {NEM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
          <span className="text-sm text-gray-500">Auto-detected: {plugin.shortName}</span>
        </div>
      )}
      {hasSolar && plugin && nemTier !== "none" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          <strong>{NEM_OPTIONS.find((o) => o.value === nemTier)?.label}:</strong>{" "}
          {NEM_OPTIONS.find((o) => o.value === nemTier)?.description}.
          {nemTier === "NEM3" && " Export credits are significantly lower than retail rates — battery storage becomes more valuable."}
          {nemTier === "NEM1" && " This legacy program is no longer available to new customers but existing customers may be grandfathered in."}
        </div>
      )}
      {result && plugin && selectedPlan && records && (
        <UsageDashboard result={result} plugin={plugin} selectedPlan={selectedPlan} records={records} nemTier={nemTier} />
      )}
    </div>
  );
}
