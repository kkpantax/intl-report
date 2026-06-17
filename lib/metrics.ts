// 指標歸組與動態指標欄位（純函式，client / server 皆可用，勿在此 import server-only 模組）。

export type MetricGroupDef = {
  key: string;
  label: string;
  count_sessions: boolean;
  count_pax: boolean;
  sessions_label: string | null;
  pax_label: string | null;
  sort_order: number;
  active: boolean;
};

// 由歸組推導出實際顯示的指標欄位（依 sort_order；同組先場次後人次）。
export type Indicator = { id: string; label: string; groupKey: string; kind: "sessions" | "pax" };

export function deriveIndicators(groups: MetricGroupDef[]): Indicator[] {
  const out: Indicator[] = [];
  for (const g of [...groups].filter((x) => x.active).sort((a, b) => a.sort_order - b.sort_order)) {
    if (g.count_sessions) out.push({ id: `${g.key}__sessions`, label: g.sessions_label || `${g.label}場次`, groupKey: g.key, kind: "sessions" });
    if (g.count_pax) out.push({ id: `${g.key}__pax`, label: g.pax_label || `${g.label}人次`, groupKey: g.key, kind: "pax" });
  }
  return out;
}

// v_unit_group_metrics 的一列：某系 × 某歸組 的場次與人次。
export type GroupMetricRow = { unit_id: number; group_key: string; sessions: number; pax: number };

// 取某系某指標的值。
export function indicatorValue(rows: GroupMetricRow[], unitId: number, ind: Indicator): number {
  const r = rows.find((x) => x.unit_id === unitId && x.group_key === ind.groupKey);
  if (!r) return 0;
  return ind.kind === "sessions" ? r.sessions : r.pax;
}

// 某系的活動總筆數（用於判斷「填報中」）＝各歸組場次（筆數）加總。
export function unitActCount(rows: GroupMetricRow[], unitId: number): number {
  return rows.filter((x) => x.unit_id === unitId).reduce((n, x) => n + (x.sessions || 0), 0);
}

// 內建預設歸組（metric_groups 表不存在或為空時的退回值）。
export const FALLBACK_GROUPS: MetricGroupDef[] = [
  { key: "outbound", label: "出國交流", count_sessions: false, count_pax: true, sessions_label: null, pax_label: "出國交流人次", sort_order: 1, active: true },
  { key: "conference", label: "研討會 / 工作營 / 工作坊", count_sessions: true, count_pax: true, sessions_label: "研討會/工作營/工作坊場次", pax_label: "研討會/工作營/工作坊人數", sort_order: 2, active: true },
];
