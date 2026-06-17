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
  - **選項管理**：增刪/停用 指標歸組、學制、活動大類（指向指標歸組）、活動類型（連動所屬大類）。
- 後台 API（需 admin token）：`/api/admin/summary`、`/api/admin/return`、`/api/admin/export`、`/api/admin/accounts`、`/api/admin/units`、`/api/admin/periods`、`/api/admin/options`、`/api/admin/metric-groups`。
- 公開讀取 API：`/api/options`（填報下拉）、`/api/college`（學院頁定時更新）。
- 學院頁與後台總覽顯示「填報中」並每 30 秒自動更新；填報頁亦定時同步全系清單。

## 慣例
- 學制／活動大類／活動類型由 DB `options` 表維護（後台「選項管理」可增刪停用）；server 端讀取與驗證走 `lib/options.ts`（表不存在或為空時退回 `lib/constants.ts` 預設值）。大類預設 DB 值：`出國交流`、`研討會工作營工作坊`。
- 指標歸組由 DB `metric_groups` 表維護（後台「選項管理 → 指標歸組」可增刪停用）；大類的 `metric_group` 對應其 `key`。指標欄位由 `lib/metrics.ts` 的 `deriveIndicators()` 依啟用歸組動態產生（同組先場次後人次）。新增歸組為人次統計；內建 `outbound`(人次)、`conference`(場次＋人數)。
- 彙總改用視圖 `v_unit_group_metrics`（各系 × 期別 × 歸組 的 sessions/pax）；填報、學院、後台、Excel 皆由此 + 歸組定義動態計算（「填報中」＝各組 sessions 加總 > 0）。`metric_groups` 不存在或為空時退回 `lib/metrics.ts` 的 `FALLBACK_GROUPS`。
- 國家/地區為靜態檔 `lib/countries.ts`（教育部國別代碼，由 `scripts/gen_countries.py` 從 docx 產生），填報用 `components/CountryCombobox.tsx`。
- 填報端絕不直接存取資料表；一律走 `/api/*`。`lib/supabaseAdmin.ts` 只能在 server 使用。
- DB 變更請寫成 `db/migrations/*.sql`（可重複執行）並同步更新 `db/schema.sql`（供全新安裝）。

## 建議 TODO（依優先序）
1. ~~**期別管理 UI**~~：已完成（後台「期數管理」分頁）。
2. **日期區間驗證**：API 端檢查 start_date 落在期別 start/end 之間（目前未強制）。
3. **匯出下載安全性**：目前 `/api/admin/export` 接受 `?t=token` 以利 window.open 下載；可改為前端 fetch 帶 Authorization header 再轉 Blob 下載，移除 query token。
4. **系所專屬連結**：可在 units 加 slug，產生各系 QR/連結直達 `/dept/[id]`。
5. **學院頁存取**：目前免登入唯讀（符合規格）；若日後要限制，可加學院代碼。
6. **UI 美化**：套用學校配色/字體；目前為功能性 Tailwind。
7. **稽核**：activities 已記 reporter；如需修改紀錄可加 audit log。

## 版本與變更紀錄規則（每次改程式都要做）
每當修改本專案程式碼，負責修改的一方（包含 Claude Code）必須在同一次變更裡：
1. 依語意化版本 SemVer 判斷本次等級，並更新 lib/version.ts 的 APP_VERSION：
   - patch（x.x.+1）：修錯字、修 bug、樣式微調。
   - minor（x.+1.0）：新增功能或欄位，且向下相容。
   - major（+1.0.0）：不相容的重大改版、資料結構或流程的破壞性變更。
   判斷依據是本次實際改了什麼、從使用者/承辦角度看的影響大小。
2. 在 CHANGELOG.md 最上方新增該版本條目（標日期，分類用 Added/Changed/Fixed/Removed）。
3. APP_VERSION 與 CHANGELOG 的版本號必須一致。使用者不需手動改版本號。
