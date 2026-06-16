# 國際交流成效回報系統（起手包）

Next.js (App Router) + Supabase。填報端免登入、後台 Supabase Auth。

## 安裝
```bash
npm install
cp .env.example .env.local   # 填入 Supabase 三把金鑰
```

## 建立資料庫
Supabase 專案 → SQL Editor → 貼上 `db/schema.sql` 執行（會建表、灌入 42 個系所、建立預設期別「115年1-6月」）。

## 建立後台帳號
Supabase → Authentication → Users → 新增國際處人員的 email/密碼。

## 啟動
```bash
npm run dev
```
- 填報端：http://localhost:3000
- 後台：http://localhost:3000/admin

## 部署
推到 GitHub → Vercel 匯入 → 設定環境變數（同 .env.local）→ Deploy。

## 環境變數
- `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`：公開。
- `SUPABASE_SERVICE_ROLE_KEY`：**機密**，只在 Vercel 環境變數設定，勿提交。
