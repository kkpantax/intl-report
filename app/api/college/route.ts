import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getOpenPeriod } from "@/lib/supabaseAdmin";
import { getActiveMetricGroups } from "@/lib/options";
import { deriveIndicators } from "@/lib/metrics";

// 學院頁公開讀取：某學院本期各系狀態與動態指標（供前端定時更新，不需登入）。
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const college = req.nextUrl.searchParams.get("college") || "";
  const period = await getOpenPeriod();

  const { data: units } = await supabaseAdmin.from("units").select("*")
    .eq("college", college).order("sort_order");
  const unitIds = (units ?? []).map((u: any) => u.id);

  const { data: groupMetrics } = await supabaseAdmin.from("v_unit_group_metrics").select("*")
    .eq("period_id", period?.id ?? -1).in("unit_id", unitIds.length ? unitIds : [-1]);
  const { data: subs, error: subsErr } = await supabaseAdmin.from("submissions").select("*")
    .eq("period_id", period?.id ?? -1).in("unit_id", unitIds.length ? unitIds : [-1]);
  // 讀取失敗回 500，前端 (CollegeClient) 會保留上一份正確資料，不會把已送出的系所洗成「填報中」
  if (subsErr) return NextResponse.json({ error: subsErr.message }, { status: 500 });

  const indicators = deriveIndicators(await getActiveMetricGroups());

  return NextResponse.json({
    period, units: units ?? [], groupMetrics: groupMetrics ?? [], subs: subs ?? [], indicators,
  });
}
