import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const pid = Number(req.nextUrl.searchParams.get("periodId"));
  const { data: periods } = await supabaseAdmin.from("periods").select("*").order("id", { ascending: false });
  const period = periods?.find((p: any) => p.id === pid) ?? periods?.find((p: any) => p.is_open) ?? periods?.[0];
  const { data: units } = await supabaseAdmin.from("units").select("*").order("sort_order");
  const { data: metrics } = await supabaseAdmin.from("v_activity_metrics").select("*").eq("period_id", period?.id ?? -1);
  const { data: subs } = await supabaseAdmin.from("submissions").select("*").eq("period_id", period?.id ?? -1);
  return NextResponse.json({ period, periods, units, metrics, subs });
}
