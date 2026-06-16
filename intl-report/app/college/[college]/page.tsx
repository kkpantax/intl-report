// 學院頁：上半＝該院三指標彙整（唯讀）＋各系填報狀態；下半＝各系卡片進入填寫。
import Link from "next/link";
import { supabaseAdmin, getOpenPeriod } from "@/lib/supabaseAdmin";
import { METRIC_LABELS } from "@/lib/constants";
import type { Unit, Submission, Metrics } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿", submitted: "已送出", returned: "已退回",
};

export default async function CollegePage({ params }: { params: { college: string } }) {
  const college = decodeURIComponent(params.college);
  const period = await getOpenPeriod();

  const { data: unitsRaw } = await supabaseAdmin.from("units").select("*")
    .eq("college", college).order("sort_order");
  const units = (unitsRaw ?? []) as Unit[];
  const unitIds = units.map((u) => u.id);

  const { data: metricsRaw } = await supabaseAdmin.from("v_activity_metrics").select("*")
    .eq("period_id", period?.id ?? -1).in("unit_id", unitIds);
  const metricsMap = new Map<number, Metrics>();
  (metricsRaw ?? []).forEach((m: any) => metricsMap.set(m.unit_id, m));

  const { data: subsRaw } = await supabaseAdmin.from("submissions").select("*")
    .eq("period_id", period?.id ?? -1).in("unit_id", unitIds);
  const subMap = new Map<number, Submission>();
  (subsRaw ?? []).forEach((s: any) => subMap.set(s.unit_id, s));

  const total = units.reduce((acc, u) => {
    const m = metricsMap.get(u.id);
    acc.outbound_pax += m?.outbound_pax ?? 0;
    acc.conf_sessions += m?.conf_sessions ?? 0;
    acc.conf_pax += m?.conf_pax ?? 0;
    return acc;
  }, { outbound_pax: 0, conf_sessions: 0, conf_pax: 0 } as Metrics);

  return (
    <div>
      <Link href="/" className="text-sm text-navy">← 回學院選單</Link>
      <h1 className="text-xl font-bold mt-2 mb-1">{college}</h1>
      <div className="text-sm text-gray-500 mb-4">{period?.name} ・ 學院彙整檢視（唯讀）</div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {(["outbound_pax", "conf_sessions", "conf_pax"] as const).map((k) => (
          <div key={k} className="rounded-xl bg-white border p-4">
            <div className="text-xs text-gray-500">{METRIC_LABELS[k]}</div>
            <div className="text-2xl font-bold text-navy">{total[k]}</div>
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
              <th className="p-3">{METRIC_LABELS.outbound_pax}</th>
              <th className="p-3">{METRIC_LABELS.conf_sessions}</th>
              <th className="p-3">{METRIC_LABELS.conf_pax}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => {
              const m = metricsMap.get(u.id);
              const s = subMap.get(u.id);
              const status = s?.no_activity ? "申報無活動" : (s ? STATUS_LABEL[s.status] : "未填");
              return (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{u.department}</td>
                  <td className="p-3 text-center">{status}</td>
                  <td className="p-3 text-center">{m?.outbound_pax ?? 0}</td>
                  <td className="p-3 text-center">{m?.conf_sessions ?? 0}</td>
                  <td className="p-3 text-center">{m?.conf_pax ?? 0}</td>
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
