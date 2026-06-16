// 入口：兩個入口（各系填報 / 國際事務處）。Server Component。
import Link from "next/link";
import { getOpenPeriod } from "@/lib/supabaseAdmin";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

export default async function Home() {
  const period = await getOpenPeriod();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10 mt-4">
        <h1 className="text-2xl md:text-3xl font-bold text-navy">實踐大學國際交流成效回報系統</h1>
        <p className="text-sm text-gray-500 mt-2">
          目前期別：<span className="font-semibold">{period?.name ?? "（尚未開放）"}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/report"
          className="block rounded-2xl border bg-white p-8 shadow-sm hover:shadow-md hover:border-navy transition text-center">
          <div className="text-4xl mb-3">📝</div>
          <div className="text-xl font-bold">各系填報登入</div>
          <div className="text-sm text-gray-500 mt-2">各系所進入填報本期國際交流成效</div>
        </Link>

        <Link href="/admin"
          className="block rounded-2xl border bg-white p-8 shadow-sm hover:shadow-md hover:border-navy transition text-center">
          <div className="text-4xl mb-3">🏛️</div>
          <div className="text-xl font-bold">國際事務處登入</div>
          <div className="text-sm text-gray-500 mt-2">後台彙整、退回、匯出與系統管理</div>
        </Link>
      </div>

      <SiteFooter />
    </div>
  );
}
