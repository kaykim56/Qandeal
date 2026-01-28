import { NextRequest, NextResponse } from "next/server";
import { createParticipation, getParticipation, deleteParticipation } from "@/lib/db/participations";
import { verifyToken } from "@/app/api/sms/verify/route";

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
    const { challengeId, userId, testerEmail, phoneNumber, verificationToken } = await request.json();

    if (!challengeId || !userId) {
      return NextResponse.json(
        { error: "challengeId와 userId가 필요합니다" },
        { status: 400 }
      );
    }

    // 전화번호 인증 토큰 검증 (테스터 이메일이 있는 경우는 어드민 테스트로 간주하여 건너뜀)
    if (!testerEmail) {
      if (!phoneNumber || !verificationToken) {
        return NextResponse.json(
          { error: "전화번호 인증이 필요합니다" },
          { status: 400 }
        );
      }

      const tokenResult = verifyToken(verificationToken);
      if (!tokenResult.valid) {
        return NextResponse.json(
          { error: "인증이 만료되었거나 유효하지 않습니다. 다시 인증해주세요." },
          { status: 401 }
        );
      }

      // 토큰에 포함된 전화번호와 요청된 전화번호가 일치하는지 확인
      const normalizedRequestPhone = phoneNumber.replace(/-/g, "");
      if (tokenResult.phoneNumber !== normalizedRequestPhone) {
        return NextResponse.json(
          { error: "전화번호가 일치하지 않습니다" },
          { status: 401 }
        );
      }
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
      phoneNumber: phoneNumber?.replace(/-/g, ""), // 전화번호 저장
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

// DELETE /api/participations?challengeId=xxx&userId=xxx - 참여 삭제 (테스터용)
export async function DELETE(request: NextRequest) {
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

    const success = await deleteParticipation(challengeId, userId);

    if (!success) {
      return NextResponse.json(
        { error: "참여 기록을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete participation:", error);
    return NextResponse.json(
      { error: "참여 삭제 실패" },
      { status: 500 }
    );
  }
}
