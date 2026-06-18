import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";

// 指標歸組管理：列出 / 新增 / 編輯（含停用）。
// 新增的歸組一律「只計人次」（count_pax=true, count_sessions=false）；
// 內建的 outbound / conference 保留原本的計算方式，key 不可變更。

// 歸組異動會改變填報頁與學院頁的指標欄位，異動後讓兩者下次造訪重抓 DB。
// 兩頁皆已是 force-dynamic；此處為 belt-and-suspenders，並讓 client Router Cache 立即失效。
function revalidateFront() {
  revalidatePath("/dept/[unitId]", "page");
  revalidatePath("/college/[college]", "page");
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("metric_groups").select("*")
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ groups: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const b = await req.json();
  const label = (b.label ?? "").trim();
  if (!label) return NextResponse.json({ error: "缺歸組名稱" }, { status: 400 });

  const key = `g_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const sort_order = Number.isFinite(Number(b.sort_order)) && b.sort_order !== "" && b.sort_order != null
    ? Number(b.sort_order) : 99;

  const { error } = await supabaseAdmin.from("metric_groups").insert({
    key, label, count_sessions: false, count_pax: true,
    sessions_label: null, pax_label: (b.pax_label ?? "").trim() || null, sort_order, active: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidateFront();
  return NextResponse.json({ ok: true, key });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if ("label" in b) { const l = (b.label ?? "").trim(); if (!l) return NextResponse.json({ error: "名稱不可空白" }, { status: 400 }); patch.label = l; }
  if ("pax_label" in b) patch.pax_label = (b.pax_label ?? "").trim() || null;
  if ("sessions_label" in b) patch.sessions_label = (b.sessions_label ?? "").trim() || null;
  if ("sort_order" in b) patch.sort_order = Number(b.sort_order) || 0;
  if ("active" in b) patch.active = !!b.active;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "無可更新欄位" }, { status: 400 });

  const { error } = await supabaseAdmin.from("metric_groups").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateFront();
  return NextResponse.json({ ok: true });
}
