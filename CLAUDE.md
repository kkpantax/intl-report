# Claude Code 交接說明

這是「國際交流成效回報系統」起手包。架構與功能已定案，見 `docs/SPEC.md`。

## 已完成
- `db/schema.sql`：4 張表 + 42 系所種子 + 預設期別 + 彙總視圖 + RLS。
- 入口 `/`：兩個入口卡片 ——「各系填報登入」→ `/report`、「國際事務處登入」→ `/admin`。
- 免登入填報端：`/report`（學院卡片）→ `/college/[college]`（學院彙整唯讀）→ `/dept/[unitId]`（姓名閘 + 全系共用清單 + 新增/編輯/刪除 + 三指標小計 + 送出鎖定/申報無活動）。
- 安全 API（server 端 service_role）：`/api/activities`、`/api/activities/[id]`、`/api/submit`。
- 後台 `/admin`：Supabase Auth 登入、登出、回入口/系所填報導覽，分頁式儀表板：
  - **總覽**：全校總覽、各系狀態、退回解鎖、Excel 匯出、切換期別。
  - **帳號管理**：列出/新增/刪除後台帳號（Supabase Auth）。
  - **填報系所管理**：列出/新增/編輯/刪除系所（units）。
  - **期數管理**：列出/新增/編輯期別、設為開放（自動關閉其它期）。
- 後台 API（需 admin token）：`/api/admin/summary`、`/api/admin/return`、`/api/admin/export`、`/api/admin/accounts`、`/api/admin/units`、`/api/admin/periods`。

## 慣例
- 大類 DB 值：`出國交流`、`研討會工作營工作坊`（標籤見 `lib/constants.ts`）。
- 填報端絕不直接存取資料表；一律走 `/api/*`。`lib/supabaseAdmin.ts` 只能在 server 使用。

## 建議 TODO（依優先序）
1. ~~**期別管理 UI**~~：已完成（後台「期數管理」分頁）。
2. **日期區間驗證**：API 端檢查 start_date 落在期別 start/end 之間（目前未強制）。
3. **匯出下載安全性**：目前 `/api/admin/export` 接受 `?t=token` 以利 window.open 下載；可改為前端 fetch 帶 Authorization header 再轉 Blob 下載，移除 query token。
4. **系所專屬連結**：可在 units 加 slug，產生各系 QR/連結直達 `/dept/[id]`。
5. **學院頁存取**：目前免登入唯讀（符合規格）；若日後要限制，可加學院代碼。
6. **UI 美化**：套用學校配色/字體；目前為功能性 Tailwind。
7. **稽核**：activities 已記 reporter；如需修改紀錄可加 audit log。
