// 後台可管理的選項（學制 / 活動大類 / 活動類型）讀取與驗證（server 端）。
// 若 options 表尚未建立或為空，退回 lib/constants 的預設值，確保系統在遷移前仍可運作。
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DEGREES, CATEGORIES, TYPES_BY_CATEGORY } from "@/lib/constants";

export type OptionKind = "degree" | "category" | "type";
export type MetricGroup = "outbound" | "conference";

export type OptionRow = {
  id: number;
  kind: OptionKind;
  value: string;
  label: string | null;
  parent: string | null;
  metric_group: MetricGroup | null;
  sort_order: number;
  active: boolean;
};

export type OptionSet = {
  degrees: { value: string; label: string }[];
  categories: { value: string; label: string; metric_group: MetricGroup }[];
  typesByCategory: Record<string, string[]>;
};

function fallback(): OptionSet {
  return {
    degrees: DEGREES.map((d) => ({ value: d, label: d })),
    categories: CATEGORIES.map((c) => ({
      value: c.value,
      label: c.label,
      metric_group: (c.value === "出國交流" ? "outbound" : "conference") as MetricGroup,
    })),
    typesByCategory: { ...TYPES_BY_CATEGORY },
  };
}

// 給填報端 / API 用：只回傳啟用中的選項。
export async function getActiveOptions(): Promise<OptionSet> {
  try {
    const { data, error } = await supabaseAdmin
      .from("options").select("*").eq("active", true)
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return fallback();
    const rows = data as OptionRow[];

    const degrees = rows.filter((r) => r.kind === "degree")
      .map((r) => ({ value: r.value, label: r.label || r.value }));
    const categories = rows.filter((r) => r.kind === "category").map((r) => ({
      value: r.value,
      label: r.label || r.value,
      metric_group: (r.metric_group === "outbound" ? "outbound" : "conference") as MetricGroup,
    }));
    const typesByCategory: Record<string, string[]> = {};
    for (const c of categories) typesByCategory[c.value] = [];
    for (const t of rows.filter((r) => r.kind === "type")) {
      const p = t.parent || "";
      (typesByCategory[p] ??= []).push(t.value);
    }
    if (degrees.length === 0 || categories.length === 0) return fallback();
    return { degrees, categories, typesByCategory };
  } catch {
    return fallback();
  }
}

// API 端驗證：學制／大類存在且啟用、類型隸屬該大類。回傳錯誤訊息或 null（通過）。
export async function validateActivityOptions(b: {
  degree: string; category: string; activity_type: string;
}): Promise<string | null> {
  const o = await getActiveOptions();
  if (!o.degrees.some((d) => d.value === b.degree)) return "學制不存在或已停用";
  if (!o.categories.some((c) => c.value === b.category)) return "活動大類不存在或已停用";
  if (!(o.typesByCategory[b.category] ?? []).includes(b.activity_type)) return "活動類型與大類不符";
  return null;
}
