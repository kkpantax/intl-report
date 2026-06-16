import { APP_VERSION, BUILD_DATE } from "@/lib/version";

export default function SiteFooter() {
  const meta = [
    `v${APP_VERSION}`,
    BUILD_DATE && `最後更新 ${BUILD_DATE}`,
  ].filter(Boolean).join(" · ");
  return (
    <footer style={{ marginTop: 48, padding: "20px 16px", borderTop: "1px solid #e5e7eb", textAlign: "center", fontSize: 13, color: "#6b7280", lineHeight: 1.8 }}>
      <div>System developed and maintained by WEITING LIU / Office of International Affairs / oia@g2.usc.edu.tw</div>
      <div>© 2026 Shih Chien University. All rights reserved.</div>
      <div style={{ color: "#9ca3af" }}>{meta}</div>
    </footer>
  );
}
