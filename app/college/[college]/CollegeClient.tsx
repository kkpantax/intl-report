"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Unit, Submission, Period } from "@/lib/types";
import { indicatorValue, unitActCount, type GroupMetricRow, type Indicator } from "@/lib/metrics";

// 各系狀態：依送出紀錄 + 是否已有活動推導（填報中＝有資料但尚未送出）。
function statusOf(s: Submission | undefined, actCount: number): { label: string; cls: string } {
  if (s?.no_activity) return { label: "申報無活動", cls: "text-gray-500" };
  if (s?.status === "submitted") return { label: "已送出", cls: "text-green-700 font-medium" };
  if (s?.status === "returned") return { label: "已退回", cls: "text-red-600" };
  if (actCount > 0) return { label: "填報中", cls: "text-amber-600 font-medium" };
  return { label: "未填", cls: "text-gray-400" };
}

export default function CollegeClient({ college, period, initialUnits, initialGroupMetrics, initialSubs, indicators: initialIndicators }: {
  college: string;
  period: Period | null;
  initialUnits: Unit[];
  initialGroupMetrics: GroupMetricRow[];
  initialSubs: Submission[];
  indicators: Indicator[];
}) {
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [gm, setGm] = useState<GroupMetricRow[]>(initialGroupMetrics);
  const [subs, setSubs] = useState<Submission[]>(initialSubs);
  const [indicators, setIndicators] = useState<Indicator[]>(initialIndicators);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/college?college=${encodeURIComponent(college)}`, { cache: "no-store" });
    if (!r.ok) return;
    const j = await r.json();
    setUnits(j.units ?? []);
    setGm(j.groupMetrics ?? []);
    setSubs(j.subs ?? []);
    if (j.indicators) setIndicators(j.indicators);
    setUpdatedAt(new Date().toLocaleTimeString("zh-TW"));
  }, [college]);

  // 每 30 秒自動更新（不必等各系送出即可看到目前進度）。
  useEffect(() => {
    setUpdatedAt(new Date().toLocaleTimeString("zh-TW"));
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const sMap = useMemo(() => {
    const m = new Map<number, Submission>();
    subs.forEach((x) => m.set(x.unit_id, x));
    return m;
  }, [subs]);

  const totals = useMemo(
    () => indicators.map((ind) => units.reduce((sum, u) => sum + indicatorValue(gm, u.id, ind), 0)),
    [indicators, units, gm]
  );

  return (
    <div>
      <Link href="/report" className="text-sm text-navy">← 回學院選單</Link>
      <h1 className="text-xl font-bold mt-2 mb-1">{college}</h1>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="text-sm text-gray-500">{period?.name} ・ 學院彙整檢視（唯讀）</div>
        <div className="text-xs text-gray-400">
          {updatedAt && <>最後更新 {updatedAt} ・ </>}每 30 秒自動更新
          <button onClick={load} className="ml-2 text-navy underline">立即更新</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {indicators.map((ind, i) => (
          <div key={ind.id} className="rounded-xl bg-white border p-4">
            <div className="text-xs text-gray-500">{ind.label}</div>
            <div className="text-2xl font-bold text-navy">{totals[i]}</div>
          </div>
        ))}
      </div>

      <h2 className="font-semibold mb-2">各系所</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white border rounded-xl overflow-hidden">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">系所</th>
              <th className="p-3">狀態</th>
              {indicators.map((ind) => <th key={ind.id} className="p-3">{ind.label}</th>)}
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => {
              const st = statusOf(sMap.get(u.id), unitActCount(gm, u.id));
              return (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{u.department}</td>
                  <td className={`p-3 text-center ${st.cls}`}>{st.label}</td>
                  {indicators.map((ind) => (
                    <td key={ind.id} className="p-3 text-center">{indicatorValue(gm, u.id, ind)}</td>
                  ))}
                  <td className="p-3 text-center">
                    <Link href={`/dept/${u.id}`} className="text-navy underline">填寫</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
