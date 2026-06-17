import { NextResponse } from "next/server";
import { getActiveOptions } from "@/lib/options";

// 填報端公開讀取啟用中的選項（學制 / 活動大類 / 活動類型）。
export const dynamic = "force-dynamic";

export async function GET() {
  const options = await getActiveOptions();
  return NextResponse.json(options);
}
