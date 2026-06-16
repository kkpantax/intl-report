import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getOpenPeriod } from "@/lib/supabaseAdmin";
import { TYPES_BY_CATEGORY } from "@/lib/constants";

// 取得某系所本期清單 + 送出狀態
export async function GET(req: NextRequest) {
  const unitId = Number(req.nextUrl.searchParams.get("unitId"));
  const period = await getOpenPeriod();
  if (!period) return NextResponse.json({ error: "未開放填報" }, { status: 400 });
  const { data: activities } = await supabaseAdmin.from("activities").select("*")
    .eq("unit_id", unitId).eq("period_id", period.id).order("created_at", { ascending: true });
  const { data: submission } = await supabaseAdmin.from("submissions").select("*")
    .eq("unit_id", unitId).eq("period_id", period.id).maybeSingle();
  return NextResponse.json({ activities: activities ?? [], submission: submission ?? null });
}

// 新增一筆活動
export async function POST(req: NextRequest) {
  const b = await req.json();
  const period = await getOpenPeriod();
  if (!period) return NextResponse.json({ error: "未開放填報" }, { status: 400 });

  // 後端驗證：單位存在、未鎖定、大類/類型合法
  const { data: unit } = await supabaseAdmin.from("units").select("id").eq("id", b.unitId).maybeSingle();
  if (!unit) return NextResponse.json({ error: "系所不存在" }, { status: 400 });
  const { data: sub } = await supabaseAdmin.from("submissions").select("status")
    .eq("unit_id", b.unitId).eq("period_id", period.id).maybeSingle();
  if (sub?.status === "submitted") return NextResponse.json({ error: "已送出鎖定，無法新增" }, { status: 409 });
  if (!(TYPES_BY_CATEGORY[b.category] ?? []).includes(b.activity_type))
    return NextResponse.json({ error: "活動類型與大類不符" }, { status: 400 });
  if (!b.reporter?.trim()) return NextResponse.json({ error: "缺填報人" }, { status: 400 });

  const { error } = await supabaseAdmin.from("activities").insert({
    period_id: period.id, unit_id: b.unitId, degree: b.degree, category: b.category,
    activity_type: b.activity_type, title: b.title, start_date: b.start_date || null,
    end_date: b.end_date || null, country: b.country || null,
    headcount: Number(b.headcount) || 0, note: b.note || null,
    reporter: b.reporter, ext: b.ext || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
