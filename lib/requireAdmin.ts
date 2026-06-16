import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
// 驗證國際處 admin 身分：優先讀 Authorization header，其次讀 ?t= 查詢參數（供瀏覽器直接下載 Excel 用）。
export async function requireAdmin(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  let token = auth.replace(/^Bearer\s+/i, "");
  if (!token) token = req.nextUrl.searchParams.get("t") || "";
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user ?? null;
}
