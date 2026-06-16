import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { CAMPUSES } from "@/lib/constants";

// 填報系所管理：列出 / 新增 / 編輯 / 刪除單位（學院＋系所）

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("units").select("*").order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ units: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const b = await req.json();
  if (!(CAMPUSES as readonly string[]).includes(b.campus))
    return NextResponse.json({ error: "校區不合法" }, { status: 400 });
  if (!b.college?.trim() || !b.department?.trim())
    return NextResponse.json({ error: "缺學院或系所名稱" }, { status: 400 });

  // units.id 非自動產生，取目前最大值 +1；sort_order 預設接續
  const { data: maxRow } = await supabaseAdmin.from("units").select("id, sort_order")
    .order("id", { ascending: false }).limit(1).maybeSingle();
  const nextId = (maxRow?.id ?? 0) + 1;
  const sort = Number.isFinite(Number(b.sort_order)) && b.sort_order !== "" && b.sort_order != null
    ? Number(b.sort_order) : (maxRow?.sort_order ?? 0) + 1;
  const { error } = await supabaseAdmin.from("units").insert({
    id: nextId, campus: b.campus, college: b.college.trim(), department: b.department.trim(), sort_order: sort,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: nextId });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  if ("campus" in b && !(CAMPUSES as readonly string[]).includes(b.campus))
    return NextResponse.json({ error: "校區不合法" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  for (const k of ["campus", "college", "department", "sort_order"]) if (k in b) patch[k] = b[k];
  const { error } = await supabaseAdmin.from("units").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  // 刪除單位會連帶刪除該系所所有期別的活動與送出紀錄（schema on delete cascade）
  const { error } = await supabaseAdmin.from("units").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
