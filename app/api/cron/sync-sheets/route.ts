import { NextRequest, NextResponse } from "next/server";
import { syncToSheets } from "@/lib/sheets-sync";

// Vercel Cron Job을 위한 인증
const CRON_SECRET = process.env.CRON_SECRET;
// Supabase Webhook 인증용
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

async function runSync() {
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
}

// GET /api/cron/sync-sheets - 매시간 Google Sheets 동기화 (Cron Job)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await runSync();
  } catch (error) {
    console.error("[sync-sheets] Unexpected error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/cron/sync-sheets - Supabase Database Webhook 트리거
export async function POST(request: NextRequest) {
  // Webhook secret 검증
  const authHeader = request.headers.get("authorization");
  if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await runSync();
  } catch (error) {
    console.error("[sync-sheets] Webhook sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
