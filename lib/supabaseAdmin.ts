// 後端專用：service_role 金鑰，繞過 RLS。絕不可 import 進 client component。
import { createClient } from '@supabase/supabase-js';
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
export async function getOpenPeriod() {
  const { data, error } = await supabaseAdmin
    .from('periods').select('*').eq('is_open', true)
    .order('id', { ascending: false }).limit(1).maybeSingle();
  // 區分「查詢失敗」與「沒有開放期別」：失敗要拋出，不能靜默回 null 害下游把期別當 -1、各系誤判為「填報中」
  if (error) throw new Error(`讀取開放期別失敗：${error.message}`);
  return data;
}
