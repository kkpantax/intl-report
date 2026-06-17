// 版本號：由做變更的 AI 依 SemVer 判斷後更新，使用者不用手動改
export const APP_VERSION = "1.2.1";
// 建置時自動帶入，不用手動改
export const BUILD_DATE = (process.env.NEXT_PUBLIC_BUILD_TIME || "").slice(0, 10);
