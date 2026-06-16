import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "實踐大學國際交流成效回報系統", description: "" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant"><body>
      <header className="bg-navy text-white px-6 py-3 text-lg font-semibold">
        <Link href="/">實踐大學國際交流成效回報系統</Link>
      </header>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </body></html>
  );
}
