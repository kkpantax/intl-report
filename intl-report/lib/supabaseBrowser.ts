// 前端 anon 金鑰：僅供 admin 登入 (Supabase Auth)，不做資料表存取。
import { createClient } from '@supabase/supabase-js';
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
