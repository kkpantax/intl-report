// 學院頁：該院三指標彙整（唯讀）＋各系填報狀態。Server 載入初始資料後交給 client 定時更新。
import { supabaseAdmin, getOpenPeriod } from "@/lib/supabaseAdmin";
import type { Unit, Submission, Metrics, Period } from "@/lib/types";
import CollegeClient from "./CollegeClient";

export const dynamic = "force-dynamic";

export default async function CollegePage({ params }: { params: { college: string } }) {
  const college = decodeURIComponent(params.college);
  const period = await getOpenPeriod();

  const { data: unitsRaw } = await supabaseAdmin.from("units").select("*")
    .eq("college", college).order("sort_order");
  const units = (unitsRaw ?? []) as Unit[];
  const unitIds = units.map((u) => u.id);

  const { data: metricsRaw } = await supabaseAdmin.from("v_activity_metrics").select("*")
    .eq("period_id", period?.id ?? -1).in("unit_id", unitIds.length ? unitIds : [-1]);
  const { data: subsRaw } = await supabaseAdmin.from("submissions").select("*")
    .eq("period_id", period?.id ?? -1).in("unit_id", unitIds.length ? unitIds : [-1]);

  return (
    <CollegeClient
      college={college}
      period={period as Period | null}
      initialUnits={units}
      initialMetrics={(metricsRaw ?? []) as (Metrics & { unit_id: number })[]}
      initialSubs={(subsRaw ?? []) as Submission[]}
    />
  );
}
