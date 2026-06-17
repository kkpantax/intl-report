import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getOpenPeriod } from "@/lib/supabaseAdmin";
import { validateActivityOptions } from "@/lib/options";

async function assertUnlocked(unitId: number) {
  const period = await getOpenPeriod();
  if (!period) return { error: "未開放填報" };
  const { data: sub } = await supabaseAdmin.from("submissions").select("status")
    .eq("unit_id", unitId).eq("period_id", period.id).maybeSingle();
  if (sub?.status === "submitted") return { error: "已送出鎖定" };
  return { period };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json();
  const chk = await assertUnlocked(b.unitId);
  if ("error" in chk) return NextResponse.json({ error: chk.error }, { status: 409 });
  const invalid = await validateActivityOptions(b);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  const { error } = await supabaseAdmin.from("activities").update({
    degree: b.degree, category: b.category, activity_type: b.activity_type, title: b.title,
    start_date: b.start_date || null, end_date: b.end_date || null, country: b.country || null,
    headcount: Number(b.headcount) || 0, note: b.note || null,
  }).eq("id", params.id).eq("unit_id", b.unitId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json();
  const chk = await assertUnlocked(b.unitId);
  if ("error" in chk) return NextResponse.json({ error: chk.error }, { status: 409 });
  const { error } = await supabaseAdmin.from("activities").delete()
    .eq("id", params.id).eq("unit_id", b.unitId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
