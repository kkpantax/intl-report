import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { CAMPUSES } from "@/lib/constants";

// 填報系所管理：列出 / 新增 / 編輯 / 刪除單位（學院＋系所）

// 單位異動後，讓前台（入口、學院選單、各學院頁）下次造訪重新查 DB，不吃舊快取
function revalidateFront() {
  revalidatePath("/");
  revalidatePath("/report");
  revalidatePath("/college/[college]", "page");
}

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

  // units.id 已改為資料庫自動遞增，這裡不再手動指定 id；sort_order 預設接續目前最大值
  const { data: maxRow } = await supabaseAdmin.from("units").select("sort_order")
    .order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const sort = Number.isFinite(Number(b.sort_order)) && b.sort_order !== "" && b.sort_order != null
    ? Number(b.sort_order) : (maxRow?.sort_order ?? 0) + 1;
  const { data: inserted, error } = await supabaseAdmin.from("units").insert({
    campus: b.campus, college: b.college.trim(), department: b.department.trim(), sort_order: sort,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateFront();
  return NextResponse.json({ ok: true, id: inserted?.id });
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
  revalidateFront();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  // 刪除單位會連帶刪除該系所所有期別的活動與送出紀錄（schema on delete cascade）
  const { error } = await supabaseAdmin.from("units").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateFront();
  return NextResponse.json({ ok: true });
}
