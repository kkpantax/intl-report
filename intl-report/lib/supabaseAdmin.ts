// 後端專用：service_role 金鑰，繞過 RLS。絕不可 import 進 client component。
import { createClient } from '@supabase/supabase-js';
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
export async function getOpenPeriod() {
  const { data } = await supabaseAdmin
    .from('periods').select('*').eq('is_open', true)
    .order('id', { ascending: false }).limit(1).maybeSingle();
  return data;
}
