# 安全說明與「公開前」檢查清單

## 這個專案的安全模型
- 填報端**免登入**：瀏覽器只拿得到 `NEXT_PUBLIC_SUPABASE_URL` 與 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，這兩個**設計上就是公開的**，repo 公開不會新增風險。
- 所有資料讀寫一律走 Next.js server 端，以 `SUPABASE_SERVICE_ROLE_KEY` 執行。這把金鑰**只能存在於 server**（Vercel 環境變數），絕不可進前端、不可 commit。
- 資料庫所有表已啟用 RLS 且無任何政策＝anon／登入者對表的直接讀寫一律被拒絕；service_role 在 server 端繞過 RLS。**不要為了方便而新增允許 anon 的政策。**

## 自動檢查（每次都會跑）
- **每次 commit**：`.husky/pre-commit` → `node scripts/security-check.mjs`，掃當前檔案，發現 CRITICAL 直接擋下。
- **每次 push / PR**：`.github/workflows/security.yml` → 同一支腳本（`--strict`）＋ gitleaks 掃**整個 git 歷史**。
- 也可隨時手動：`npm run security-check`。

## 公開 repo 前，務必做這幾件事
1. `npm run security-check` 通過（無 CRITICAL）。
2. 在 GitHub Actions 跑一次 security workflow，確認 **gitleaks 歷史掃描**也通過——本機腳本只看當前檔案，**抓不到「曾經 commit、後來刪掉」的金鑰**，那種只有歷史掃描看得到。
3. 若歷史中曾出現過 `service_role` 金鑰（即使已刪）：到 Supabase Dashboard → Settings → API **輪替（reset）service_role key**，並更新 Vercel 環境變數。金鑰一旦進過公開歷史就視為已外洩，清歷史不如直接換掉金鑰來得可靠。
4. 確認 `.env.local` 沒被追蹤：`git ls-files | grep -i "\.env"` 應只列出 `.env.example`。
5. 確認 Vercel 上 `SUPABASE_SERVICE_ROLE_KEY` 設為環境變數，且原始碼任何地方都沒有它的值。

## 定期（與 repo 公開與否無關，但值得顧）
- RLS 仍為「啟用且零政策」——若日後有人加表，記得新表也要 `enable row level security`。
