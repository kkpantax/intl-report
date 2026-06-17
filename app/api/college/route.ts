import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getOpenPeriod } from "@/lib/supabaseAdmin";

// 學院頁公開讀取：某學院本期的各系狀態與三指標（供前端定時更新，不需登入）。
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const college = req.nextUrl.searchParams.get("college") || "";
  const period = await getOpenPeriod();

  const { data: units } = await supabaseAdmin.from("units").select("*")
    .eq("college", college).order("sort_order");
  const unitIds = (units ?? []).map((u: any) => u.id);

  const { data: metrics } = await supabaseAdmin.from("v_activity_metrics").select("*")
    .eq("period_id", period?.id ?? -1).in("unit_id", unitIds.length ? unitIds : [-1]);
  const { data: subs } = await supabaseAdmin.from("submissions").select("*")
    .eq("period_id", period?.id ?? -1).in("unit_id", unitIds.length ? unitIds : [-1]);

  return NextResponse.json({ period, units: units ?? [], metrics: metrics ?? [], subs: subs ?? [] });
}
