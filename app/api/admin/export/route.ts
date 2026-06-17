import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { getActiveMetricGroups } from "@/lib/options";
import { deriveIndicators, indicatorValue, type GroupMetricRow } from "@/lib/metrics";
import ExcelJS from "exceljs";

// 匯出 Excel：明細表 + 統計總表（指標欄位依後台設定的指標歸組動態產生）
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const pid = Number(req.nextUrl.searchParams.get("periodId"));
  const { data: periods } = await supabaseAdmin.from("periods").select("*").order("id", { ascending: false });
  const period = periods?.find((p: any) => p.id === pid) ?? periods?.find((p: any) => p.is_open) ?? periods?.[0];
  const { data: units } = await supabaseAdmin.from("units").select("*").order("sort_order");
  const { data: acts } = await supabaseAdmin.from("activities").select("*").eq("period_id", period.id);
  const { data: gm } = await supabaseAdmin.from("v_unit_group_metrics").select("*").eq("period_id", period.id);
  const groupMetrics = (gm ?? []) as GroupMetricRow[];
  const uMap = new Map<number, any>(); (units ?? []).forEach((u: any) => uMap.set(u.id, u));
  // 大類顯示文字（後台可自訂；找不到則用原值）
  const { data: cats } = await supabaseAdmin.from("options").select("value,label").eq("kind", "category");
  const catLabel = new Map<string, string>(); (cats ?? []).forEach((c: any) => catLabel.set(c.value, c.label || c.value));
  const indicators = deriveIndicators(await getActiveMetricGroups());

  const wb = new ExcelJS.Workbook();
  const NAVY = "FF1F3864";

  // 統計總表
  const s = wb.addWorksheet("統計總表");
  const lastCol = String.fromCharCode("A".charCodeAt(0) + 2 + indicators.length); // 校區/學院/系所 + 指標數
  s.addRow([`${period.name} 學生國際交流成效 — 統計總表`]);
  s.mergeCells(`A1:${lastCol}1`); s.getRow(1).font = { bold: true, size: 13 };
  const head = ["校區", "學院", "系所", ...indicators.map((i) => i.label)];
  s.addRow(head);
  s.getRow(2).eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; });
  const tot = indicators.map(() => 0);
  (units ?? []).forEach((u: any) => {
    const vals = indicators.map((ind) => indicatorValue(groupMetrics, u.id, ind));
    vals.forEach((v, i) => (tot[i] += v));
    s.addRow([u.campus, u.college, u.department, ...vals]);
  });
  const totRow = s.addRow(["全校合計", "", "", ...tot]);
  totRow.font = { bold: true };
  s.columns.forEach((c, i) => (c.width = i < 3 ? [8, 16, 26][i] : 20));

  // 明細表
  const d = wb.addWorksheet("明細表");
  const dhead = ["校區", "學院", "系所", "學制", "活動大類", "活動類型", "活動名稱", "開始日期", "結束日期", "國家/地區", "參與人數", "備註", "填報人"];
  d.addRow(dhead);
  d.getRow(1).eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; });
  (acts ?? []).forEach((a: any) => {
    const u = uMap.get(a.unit_id) ?? {};
    const cat = catLabel.get(a.category) ?? a.category;
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
