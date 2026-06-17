import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { getActiveMetricGroups } from "@/lib/options";
import { deriveIndicators } from "@/lib/metrics";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const pid = Number(req.nextUrl.searchParams.get("periodId"));
  const { data: periods } = await supabaseAdmin.from("periods").select("*").order("id", { ascending: false });
  const period = periods?.find((p: any) => p.id === pid) ?? periods?.find((p: any) => p.is_open) ?? periods?.[0];
  const { data: units } = await supabaseAdmin.from("units").select("*").order("sort_order");
  const { data: groupMetrics } = await supabaseAdmin.from("v_unit_group_metrics").select("*").eq("period_id", period?.id ?? -1);
  const { data: subs } = await supabaseAdmin.from("submissions").select("*").eq("period_id", period?.id ?? -1);
  const indicators = deriveIndicators(await getActiveMetricGroups());
  return NextResponse.json({ period, periods, units, groupMetrics: groupMetrics ?? [], subs, indicators });
}
