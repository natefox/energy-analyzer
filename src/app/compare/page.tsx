"use client";

import { useState } from "react";
import { getPlugins, getPlugin } from "@/lib/registry";

import PlanComparison from "@/components/PlanComparison";

export default function ComparePage() {
  const plugins = getPlugins();
  const [utilityId, setUtilityId] = useState(plugins[0]?.id || "sdge");
  const plugin = getPlugin(utilityId);

  if (!plugin) return <p>No utility plugins available.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compare Rate Plans</h1>
        <p className="text-gray-600 mt-1">
          Select your utility provider, then compare plans side by side
        </p>
      </div>

      {/* Prominent utility selector */}
      <div className="flex gap-3">
        {plugins.map((p) => (
          <button
            key={p.id}
            onClick={() => setUtilityId(p.id)}
            className={`flex-1 py-3 px-4 rounded-xl text-center font-semibold text-lg border-2 transition-all ${
              utilityId === p.id
                ? "border-emerald-600 bg-emerald-600 text-white shadow-md"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            {p.shortName}
            <span className="block text-xs font-normal mt-0.5 opacity-80">{p.name}</span>
          </button>
        ))}
      </div>

      <PlanComparison key={utilityId} plugin={plugin} />
    </div>
  );
}
