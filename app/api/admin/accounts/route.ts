import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";

// 帳號管理：管理可登入後台的國際處帳號（Supabase Auth）

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const users = (data?.users ?? []).map((u) => ({
    id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
  }));
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const b = await req.json();
  if (!b.email?.trim() || !b.password) return NextResponse.json({ error: "缺 Email 或密碼" }, { status: 400 });
  if (String(b.password).length < 6) return NextResponse.json({ error: "密碼至少 6 碼" }, { status: 400 });
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email: b.email.trim(), password: b.password, email_confirm: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const me = await requireAdmin(req);
  if (!me) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  if (id === me.id) return NextResponse.json({ error: "不可刪除自己目前登入的帳號" }, { status: 400 });
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
