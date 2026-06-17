// 系填報頁（server 載入資料後交給 client 互動）
import Link from "next/link";
import { supabaseAdmin, getOpenPeriod } from "@/lib/supabaseAdmin";
import { getActiveOptions } from "@/lib/options";
import type { Unit, Activity, Submission } from "@/lib/types";
import DeptClient from "./DeptClient";

export const dynamic = "force-dynamic";

export default async function DeptPage({ params }: { params: { unitId: string } }) {
  const unitId = Number(params.unitId);
  const period = await getOpenPeriod();
  const { data: unit } = await supabaseAdmin.from("units").select("*").eq("id", unitId).single();
  if (!unit) return <div>找不到此系所。<Link href="/report" className="text-navy underline">回學院選單</Link></div>;

  const { data: acts } = await supabaseAdmin.from("activities").select("*")
    .eq("unit_id", unitId).eq("period_id", period?.id ?? -1)
    .order("created_at", { ascending: true });
  const { data: sub } = await supabaseAdmin.from("submissions").select("*")
    .eq("unit_id", unitId).eq("period_id", period?.id ?? -1).maybeSingle();

  const options = await getActiveOptions();

  return (
    <DeptClient
      unit={unit as Unit}
      period={period}
      initialActivities={(acts ?? []) as Activity[]}
      initialSubmission={(sub ?? null) as Submission | null}
      options={options}
    />
  );
}
