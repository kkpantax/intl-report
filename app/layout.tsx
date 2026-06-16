import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "國際交流成效回報系統", description: "" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant"><body>
      <header className="bg-navy text-white px-6 py-3 text-lg font-semibold">國際交流成效回報系統</header>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </body></html>
  );
}
