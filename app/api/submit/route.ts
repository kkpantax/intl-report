import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getOpenPeriod } from "@/lib/supabaseAdmin";

// 系所確認送出 → 鎖定（upsert submissions）
export async function POST(req: NextRequest) {
  const b = await req.json();
  const period = await getOpenPeriod();
  if (!period) return NextResponse.json({ error: "未開放填報" }, { status: 400 });

  const { error } = await supabaseAdmin.from("submissions").upsert({
    period_id: period.id, unit_id: b.unitId, status: "submitted",
    no_activity: !!b.noActivity, submitted_by: b.reporter || null,
    submitted_at: new Date().toISOString(),
  }, { onConflict: "period_id,unit_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
