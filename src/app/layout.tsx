import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Energy Analyzer",
  description: "Compare utility rate plans and analyze your energy usage. Supports SDG&E and SCE.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-8 min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
