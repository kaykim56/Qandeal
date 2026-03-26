import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/supabase";
import { getChallengeById, updateChallenge, deleteChallenge } from "@/lib/db/challenges";
import { syncToSheets } from "@/lib/sheets-sync";

// GET /api/challenges/[id] - 특정 챌린지 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const challenge = await getChallengeById(id);

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    return NextResponse.json(challenge);
  } catch (error) {
    console.error("Failed to fetch challenge:", error);
    return NextResponse.json({ error: "Failed to fetch challenge" }, { status: 500 });
  }
}

// PUT /api/challenges/[id] - 챌린지 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isAdmin } = await getSessionFromCookie(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // 구 형식 필드 제거 (missionSteps 사용)
    delete body.purchaseExampleImage;
    delete body.reviewExampleImage;

    const success = await updateChallenge(id, body);

    if (!success) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Google Sheets에도 동기화 (실패해도 Supabase 수정은 유지)
    syncToSheets().catch((err) =>
      console.error("[challenges] Google Sheets 수정 동기화 실패:", err)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update challenge:", error);
    return NextResponse.json({ error: "Failed to update challenge" }, { status: 500 });
  }
}

// DELETE /api/challenges/[id] - 챌린지 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isAdmin } = await getSessionFromCookie(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const success = await deleteChallenge(id);

    if (!success) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Google Sheets에서도 동기화 (실패해도 Supabase 삭제는 유지)
    syncToSheets().catch((err) =>
      console.error("[challenges] Google Sheets 삭제 동기화 실패:", err)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete challenge:", error);
    return NextResponse.json({ error: "Failed to delete challenge" }, { status: 500 });
  }
}
