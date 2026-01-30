import { NextRequest, NextResponse } from "next/server";
import { syncToSheets } from "@/lib/sheets-sync";

// Vercel Cron Job을 위한 인증
const CRON_SECRET = process.env.CRON_SECRET;

// GET /api/cron/sync-sheets - 매시간 Google Sheets 동기화 (Cron Job)
export async function GET(request: NextRequest) {
  // Cron 인증 확인 (Vercel Cron은 Authorization 헤더로 인증)
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[sync-sheets] Starting sync...");
    const result = await syncToSheets();

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Sync failed",
          details: result.error,
          timestamp: result.timestamp,
        },
        { status: 500 }
      );
    }

    console.log(`[sync-sheets] Sync completed: ${result.syncedRows} rows`);

    return NextResponse.json({
      success: true,
      syncedRows: result.syncedRows,
      tabs: result.tabs,
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error("[sync-sheets] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
