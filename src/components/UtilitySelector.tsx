"use client";

import { getPlugins } from "@/lib/registry";

interface Props {
  selectedId: string;
  onChange: (id: string) => void;
}

export default function UtilitySelector({ selectedId, onChange }: Props) {
  const plugins = getPlugins();
  return (
    <select
      value={selectedId}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
    >
      {plugins.map((p) => (
        <option key={p.id} value={p.id}>
          {p.shortName}
        </option>
      ))}
    </select>
  );
}
