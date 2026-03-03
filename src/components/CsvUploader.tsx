"use client";

import { useCallback, useState } from "react";
import { detectUtility } from "@/lib/registry";
import type { IntervalRecord, UtilityPlugin } from "@/lib/types";

interface CsvUploaderProps {
  onDataLoaded: (records: IntervalRecord[], plugin: UtilityPlugin) => void;
}

export default function CsvUploader({ onDataLoaded }: CsvUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const processText = useCallback(
    (text: string) => {
      setError(null);
      const plugin = detectUtility(text);
      if (!plugin) {
        setError("Could not detect utility format. Please upload an SDG&E or SCE CSV file.");
        return;
      }
      try {
        const records = plugin.parseCsv(text);
        if (records.length === 0) { setError("No usage data found in the file."); return; }
        onDataLoaded(records, plugin);
      } catch (e) {
        setError(`Error parsing CSV: ${(e as Error).message}`);
      }
    },
    [onDataLoaded]
  );

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => processText(e.target?.result as string);
      reader.readAsText(file);
    },
    [processText]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? "border-emerald-500 bg-emerald-50" : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <p className="text-gray-600 mb-2">Drag & drop your CSV file here, or</p>
        <label className="inline-block cursor-pointer bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors">
          Browse Files
          <input type="file" accept=".csv" className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
          />
        </label>
        <p className="text-sm text-gray-400 mt-2">Supports SDG&E and SCE CSV formats</p>
      </div>
      <details className="group">
        <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">Or paste CSV data directly</summary>
        <div className="mt-2 space-y-2">
          <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste your CSV data here..."
            className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm font-mono resize-y"
          />
          <button onClick={() => processText(pasteText)} disabled={!pasteText.trim()}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Analyze Data
          </button>
        </div>
      </details>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
    </div>
  );
}
