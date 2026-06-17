import { NextResponse } from "next/server";
import { getActiveOptions, getActiveMetricGroups } from "@/lib/options";

// 填報端公開讀取啟用中的選項（學制 / 活動大類 / 活動類型）與指標歸組。
export const dynamic = "force-dynamic";

export async function GET() {
  const [options, metricGroups] = await Promise.all([getActiveOptions(), getActiveMetricGroups()]);
  return NextResponse.json({ ...options, metricGroups });
}
