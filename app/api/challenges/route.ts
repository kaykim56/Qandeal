import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/supabase";
import { getAllChallenges, createChallenge } from "@/lib/db/challenges";
import { syncToSheets } from "@/lib/sheets-sync";
import { ChallengeInput } from "@/lib/types";

// GET /api/challenges - 모든 챌린지 조회
export async function GET() {
  try {
    const challenges = await getAllChallenges();
    return NextResponse.json(challenges);
  } catch (error) {
    console.error("Failed to fetch challenges:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch challenges", details: errorMessage }, { status: 500 });
  }
}

// POST /api/challenges - 새 챌린지 생성
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, user } = await getSessionFromCookie(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ChallengeInput = await request.json();
    const createdBy = user?.email || "";
    const id = await createChallenge(body, createdBy);

    // Google Sheets에도 동기화 (실패해도 Supabase 생성은 유지)
    syncToSheets().catch((err) =>
      console.error("[challenges] Google Sheets 동기화 실패:", err)
    );

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create challenge:", error);
    return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 });
  }
}
