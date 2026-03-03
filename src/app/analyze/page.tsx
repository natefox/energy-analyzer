"use client";

import { useState, useMemo, useCallback } from "react";
import type { IntervalRecord, UtilityPlugin } from "@/lib/types";
import { getPlugins } from "@/lib/registry";
import CsvUploader from "@/components/CsvUploader";
import UsageDashboard from "@/components/UsageDashboard";
import { calculateCosts } from "@/lib/calculator";

export default function AnalyzePage() {
  const plugins = getPlugins();
  const [records, setRecords] = useState<IntervalRecord[] | null>(null);
  const [plugin, setPlugin] = useState<UtilityPlugin | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const handleDataLoaded = useCallback(
    (newRecords: IntervalRecord[], detectedPlugin: UtilityPlugin) => {
      setRecords(newRecords);
      setPlugin(detectedPlugin);
      setSelectedPlanId(detectedPlugin.defaultPlanId);
    },
    []
  );

  const selectedPlan = plugin?.plans.find((p) => p.id === selectedPlanId);

  const result = useMemo(() => {
    if (!records || !selectedPlan || !plugin) return null;
    return calculateCosts(records, selectedPlan, plugin);
  }, [records, selectedPlan, plugin]);

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
        <div className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Rate Plan:</label>
          <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm">
            {plugin.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="text-sm text-gray-500">Auto-detected: {plugin.shortName}</span>
        </div>
      )}
      {result && plugin && selectedPlan && records && (
        <UsageDashboard result={result} plugin={plugin} selectedPlan={selectedPlan} records={records} />
      )}
    </div>
  );
}
