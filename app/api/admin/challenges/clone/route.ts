import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getChallengeById, createChallenge, updateMissionSteps } from "@/lib/google-sheets";

// POST /api/admin/challenges/clone - 챌린지 복제
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId } = await request.json();

    if (!challengeId) {
      return NextResponse.json({ error: "challengeId required" }, { status: 400 });
    }

    // 기존 챌린지 조회
    const existing = await getChallengeById(challengeId);
    if (!existing) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // 새 챌린지 생성 (새 nanoid가 자동으로 생성됨)
    const newId = await createChallenge({
      platform: existing.platform,
      title: existing.title,
      option: existing.option,
      purchaseDeadline: existing.purchaseDeadline,
      reviewDeadline: existing.reviewDeadline,
      originalPrice: existing.originalPrice,
      paybackRate: existing.paybackRate,
      paybackAmount: existing.paybackAmount,
      finalPrice: existing.finalPrice,
      productImage: existing.productImage,
      productLink: existing.productLink,
      detailImages: existing.detailImages,
      missionSteps: existing.missionSteps,
      status: "draft", // 복제본은 항상 draft로 시작
    }, session.user?.email || "");

    // missionSteps 업데이트 (이미지 URL 포함)
    if (existing.missionSteps && existing.missionSteps.length > 0) {
      await updateMissionSteps(newId, existing.missionSteps);
    }

    return NextResponse.json({
      success: true,
      newId,
      message: `챌린지가 복제되었습니다. 새 ID: ${newId}`
    });
  } catch (error) {
    console.error("Failed to clone challenge:", error);
    return NextResponse.json({ error: "Clone failed" }, { status: 500 });
  }
}
