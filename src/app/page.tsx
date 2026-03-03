import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Take Control of Your Energy Costs</h1>
        <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
          Compare rate plans and analyze your actual usage data. Supports SDG&E and Southern California Edison.
        </p>
      </section>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Link href="/compare" className="group bg-white rounded-xl p-8 shadow-sm border hover:shadow-md transition-shadow">
          <div className="text-3xl mb-4">&#9889;</div>
          <h2 className="text-2xl font-bold group-hover:text-emerald-600 transition-colors">Compare Rate Plans</h2>
          <p className="mt-2 text-gray-600">See which rate plan saves you the most based on your estimated usage pattern. Compare side-by-side.</p>
        </Link>
        <Link href="/analyze" className="group bg-white rounded-xl p-8 shadow-sm border hover:shadow-md transition-shadow">
          <div className="text-3xl mb-4">&#128200;</div>
          <h2 className="text-2xl font-bold group-hover:text-emerald-600 transition-colors">Analyze Your Usage</h2>
          <p className="mt-2 text-gray-600">Upload your utility CSV and see exactly how your energy costs break down by time of use.</p>
        </Link>
      </section>
      <section className="text-center">
        <p className="text-sm text-gray-400 uppercase tracking-wide mb-3">Supported Utilities</p>
        <div className="flex justify-center gap-8">
          <span className="text-lg font-semibold text-gray-700">SDG&E</span>
          <span className="text-lg font-semibold text-gray-700">SCE</span>
        </div>
      </section>
    </div>
  );
}
