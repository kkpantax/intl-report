import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";

// 退回：解除鎖定，讓系所可再編輯
export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const b = await req.json();
  const { error } = await supabaseAdmin.from("submissions")
    .update({ status: "returned" }).eq("period_id", b.periodId).eq("unit_id", b.unitId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
