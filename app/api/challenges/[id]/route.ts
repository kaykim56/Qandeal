import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getChallengeById, updateChallenge, deleteChallenge, updateMissionImages } from "@/lib/google-sheets";

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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // missionSteps가 있으면 새 형식 사용, 없을 때만 구 형식 사용
    if (!body.missionSteps && (body.purchaseExampleImage || body.reviewExampleImage)) {
      await updateMissionImages(
        id,
        body.purchaseExampleImage || "",
        body.reviewExampleImage || ""
      );
    }
    delete body.purchaseExampleImage;
    delete body.reviewExampleImage;

    const success = await updateChallenge(id, body);

    if (!success) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const success = await deleteChallenge(id);

    if (!success) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete challenge:", error);
    return NextResponse.json({ error: "Failed to delete challenge" }, { status: 500 });
  }
}
