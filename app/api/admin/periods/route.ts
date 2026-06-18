import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";

// 期數管理：列出 / 新增 / 編輯（含開關 is_open）

// 期別異動（尤其切換開放期）後，讓所有讀「目前開放期別」的前台頁面下次造訪重抓 DB。
// 這些頁面已是 force-dynamic；此處為 belt-and-suspenders，並讓 client Router Cache 立即失效。
function revalidateFront() {
  revalidatePath("/report");
  revalidatePath("/college/[college]", "page");
  revalidatePath("/dept/[unitId]", "page");
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("periods").select("*").order("id", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ periods: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const b = await req.json();
  if (!b.name?.trim() || !b.start_date || !b.end_date)
    return NextResponse.json({ error: "缺名稱或日期區間" }, { status: 400 });
  if (b.start_date > b.end_date)
    return NextResponse.json({ error: "起始日不可晚於結束日" }, { status: 400 });

  // 同一時間建議只開一期：若新期設為開放，先關閉其它期
  if (b.is_open) await supabaseAdmin.from("periods").update({ is_open: false }).neq("id", -1);
  const { error } = await supabaseAdmin.from("periods").insert({
    name: b.name.trim(), start_date: b.start_date, end_date: b.end_date, is_open: !!b.is_open,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateFront();
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  if (b.start_date && b.end_date && b.start_date > b.end_date)
    return NextResponse.json({ error: "起始日不可晚於結束日" }, { status: 400 });

  // 設為開放時，先關閉其它期，確保同時間只開一期
  if (b.is_open === true) await supabaseAdmin.from("periods").update({ is_open: false }).neq("id", b.id);
  const patch: Record<string, unknown> = {};
  for (const k of ["name", "start_date", "end_date", "is_open"]) if (k in b) patch[k] = b[k];
  const { error } = await supabaseAdmin.from("periods").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateFront();
  return NextResponse.json({ ok: true });
}
