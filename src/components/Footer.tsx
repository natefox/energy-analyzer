export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-gray-500 space-y-3">
        <p>Energy Analyzer — Compare utility rate plans and analyze your energy usage.</p>
        <p>Supports SDG&E and SCE. Not affiliated with any utility company.</p>
        <div className="flex justify-center gap-4 text-gray-400">
          <a
            href="https://github.com/natefox/energy-analyzer"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600 transition-colors"
          >
            GitHub
          </a>
          <span>|</span>
          <a
            href="https://github.com/natefox/energy-analyzer/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600 transition-colors"
          >
            Report an Issue
          </a>
          <span>|</span>
          <a
            href="https://sdge.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600 transition-colors"
          >
            Inspired by sdge.ca
          </a>
        </div>
      </div>
    </footer>
  );
}
