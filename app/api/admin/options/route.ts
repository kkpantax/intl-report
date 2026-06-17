import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";

// 選項管理：學制 / 活動大類 / 活動類型 的列出 / 新增 / 編輯（含停用）。
// 注意：value（存入 activities 的字串）與 kind 建立後不可變更，以維持歷史紀錄對應。
// 「刪除」一律以停用（active=false）處理，避免破壞既有活動與大類的指標歸組。

const KINDS = ["degree", "category", "type"] as const;
const GROUPS = ["outbound", "conference"] as const;

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("options").select("*")
    .order("kind", { ascending: true }).order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ options: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const b = await req.json();
  if (!(KINDS as readonly string[]).includes(b.kind))
    return NextResponse.json({ error: "類別不合法" }, { status: 400 });
  const value = (b.value ?? "").trim();
  if (!value) return NextResponse.json({ error: "缺項目名稱" }, { status: 400 });

  let parent: string | null = null;
  let metric_group: string | null = null;

  if (b.kind === "type") {
    parent = (b.parent ?? "").trim() || null;
    if (!parent) return NextResponse.json({ error: "活動類型需指定所屬大類" }, { status: 400 });
    const { data: cat } = await supabaseAdmin.from("options").select("id")
      .eq("kind", "category").eq("value", parent).maybeSingle();
    if (!cat) return NextResponse.json({ error: "所屬大類不存在" }, { status: 400 });
  }
  if (b.kind === "category") {
    metric_group = b.metric_group;
    if (!(GROUPS as readonly string[]).includes(metric_group ?? ""))
      return NextResponse.json({ error: "請選擇大類的指標歸組" }, { status: 400 });
  }

  const sort_order = Number.isFinite(Number(b.sort_order)) && b.sort_order !== "" && b.sort_order != null
    ? Number(b.sort_order) : 0;

  const { error } = await supabaseAdmin.from("options").insert({
    kind: b.kind, value, label: (b.label ?? "").trim() || null,
    parent, metric_group, sort_order, active: true,
  });
  if (error) {
    const msg = /duplicate|unique/i.test(error.message) ? "此項目已存在" : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "缺 id" }, { status: 400 });

  if ("metric_group" in b && b.metric_group != null && !(GROUPS as readonly string[]).includes(b.metric_group))
    return NextResponse.json({ error: "指標歸組不合法" }, { status: 400 });

  // 僅允許更新顯示與行為欄位；value / kind / parent 不可改。
  const patch: Record<string, unknown> = {};
  if ("label" in b) patch.label = (b.label ?? "").trim() || null;
  if ("metric_group" in b) patch.metric_group = b.metric_group;
  if ("sort_order" in b) patch.sort_order = Number(b.sort_order) || 0;
  if ("active" in b) patch.active = !!b.active;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "無可更新欄位" }, { status: 400 });

  const { error } = await supabaseAdmin.from("options").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
