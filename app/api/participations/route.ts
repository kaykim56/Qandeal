import { NextRequest, NextResponse } from "next/server";
import { createParticipation, getParticipation } from "@/lib/google-sheets";

// GET /api/participations?challengeId=xxx&userId=xxx - 참여 정보 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get("challengeId");
    const userId = searchParams.get("userId");

    if (!challengeId || !userId) {
      return NextResponse.json(
        { error: "challengeId와 userId가 필요합니다" },
        { status: 400 }
      );
    }

    const participation = await getParticipation(challengeId, userId);

    if (!participation) {
      return NextResponse.json({ participation: null });
    }

    return NextResponse.json({ participation });
  } catch (error) {
    console.error("Failed to get participation:", error);
    return NextResponse.json(
      { error: "참여 정보 조회 실패" },
      { status: 500 }
    );
  }
}

// POST /api/participations - 참가하기
export async function POST(request: Request) {
  try {
    const { challengeId, userId, testerEmail } = await request.json();

    if (!challengeId || !userId) {
      return NextResponse.json(
        { error: "challengeId와 userId가 필요합니다" },
        { status: 400 }
      );
    }

    // 이미 참여했는지 확인
    const existing = await getParticipation(challengeId, userId);
    if (existing) {
      return NextResponse.json({
        success: true,
        participationId: existing.id,
        existing: true,
      });
    }

    // 새 참여 생성
    const participationId = await createParticipation({
      challengeId,
      userId,
      testerEmail, // 어드민 테스트 시 이메일
    });

    return NextResponse.json({
      success: true,
      participationId,
      existing: false,
    });
  } catch (error) {
    console.error("Failed to create participation:", error);
    return NextResponse.json(
      { error: "참여 생성 실패" },
      { status: 500 }
    );
  }
}
