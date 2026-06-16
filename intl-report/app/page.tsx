// 入口：卡片選學院（依校區分組）。Server Component。
import Link from "next/link";
import { supabaseAdmin, getOpenPeriod } from "@/lib/supabaseAdmin";
import type { Unit } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const period = await getOpenPeriod();
  const { data: units } = await supabaseAdmin.from("units").select("*").order("sort_order");
  const list = (units ?? []) as Unit[];
  const campuses = ["台北", "高雄"];

  return (
    <div>
      <div className="mb-4 text-sm text-gray-600">
        目前期別：<span className="font-semibold">{period?.name ?? "（尚未開放）"}</span>
      </div>
      <h1 className="text-xl font-bold mb-4">請選擇學院</h1>
      {campuses.map((c) => {
        const colleges = Array.from(new Set(list.filter((u) => u.campus === c).map((u) => u.college)));
        return (
          <section key={c} className="mb-8">
            <h2 className="text-navy font-semibold mb-3">{c}校區</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {colleges.map((col) => (
                <Link key={col} href={`/college/${encodeURIComponent(col)}`}
                  className="block rounded-xl border bg-white p-5 shadow-sm hover:shadow-md hover:border-navy transition">
                  <div className="text-lg font-semibold">{col}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {list.filter((u) => u.college === col).length} 個系所
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
