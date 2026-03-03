"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-emerald-600">Energy Analyzer</Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/compare" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Compare Plans</Link>
          <Link href="/analyze" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Analyze Usage</Link>
        </nav>
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2" aria-label="Toggle menu">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      {menuOpen && (
        <nav className="md:hidden border-t px-4 py-3 space-y-2">
          <Link href="/compare" className="block text-gray-600 hover:text-gray-900" onClick={() => setMenuOpen(false)}>Compare Plans</Link>
          <Link href="/analyze" className="block text-gray-600 hover:text-gray-900" onClick={() => setMenuOpen(false)}>Analyze Usage</Link>
        </nav>
      )}
    </header>
  );
}
