import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import ExcelJS from "exceljs";

// 匯出 Excel：明細表 + 統計總表（沿用去年格式）
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const pid = Number(req.nextUrl.searchParams.get("periodId"));
  const { data: periods } = await supabaseAdmin.from("periods").select("*").order("id", { ascending: false });
  const period = periods?.find((p: any) => p.id === pid) ?? periods?.find((p: any) => p.is_open) ?? periods?.[0];
  const { data: units } = await supabaseAdmin.from("units").select("*").order("sort_order");
  const { data: acts } = await supabaseAdmin.from("activities").select("*").eq("period_id", period.id);
  const { data: metrics } = await supabaseAdmin.from("v_activity_metrics").select("*").eq("period_id", period.id);
  const mMap = new Map<number, any>(); (metrics ?? []).forEach((m: any) => mMap.set(m.unit_id, m));
  const uMap = new Map<number, any>(); (units ?? []).forEach((u: any) => uMap.set(u.id, u));

  const wb = new ExcelJS.Workbook();
  const NAVY = "FF1F3864";

  // 統計總表
  const s = wb.addWorksheet("統計總表");
  s.addRow([`${period.name} 學生國際交流成效 — 統計總表`]);
  s.mergeCells("A1:F1"); s.getRow(1).font = { bold: true, size: 13 };
  const head = ["校區", "學院", "系所", "出國交流人次", "研討會/工作營/工作坊場次", "研討會/工作營/工作坊人數"];
  s.addRow(head);
  s.getRow(2).eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; });
  let tot = [0, 0, 0];
  (units ?? []).forEach((u: any) => {
    const m = mMap.get(u.id) ?? { outbound_pax: 0, conf_sessions: 0, conf_pax: 0 };
    tot[0] += m.outbound_pax; tot[1] += m.conf_sessions; tot[2] += m.conf_pax;
    s.addRow([u.campus, u.college, u.department, m.outbound_pax, m.conf_sessions, m.conf_pax]);
  });
  const totRow = s.addRow(["全校合計", "", "", tot[0], tot[1], tot[2]]);
  totRow.font = { bold: true };
  s.columns.forEach((c, i) => (c.width = [8, 16, 26, 14, 22, 22][i]));

  // 明細表
  const d = wb.addWorksheet("明細表");
  const dhead = ["校區", "學院", "系所", "學制", "活動大類", "活動類型", "活動名稱", "開始日期", "結束日期", "國家/地區", "參與人數", "備註", "填報人"];
  d.addRow(dhead);
  d.getRow(1).eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; });
  (acts ?? []).forEach((a: any) => {
    const u = uMap.get(a.unit_id) ?? {};
    const cat = a.category === "出國交流" ? "出國交流" : "研討會/工作營/工作坊";
    d.addRow([u.campus, u.college, u.department, a.degree, cat, a.activity_type, a.title, a.start_date, a.end_date, a.country, a.headcount, a.note, a.reporter]);
  });
  d.columns.forEach((c, i) => (c.width = [7, 14, 22, 12, 16, 14, 40, 13, 13, 12, 9, 24, 12][i]));

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="intl-report-${period.id}.xlsx"`,
    },
  });
}
