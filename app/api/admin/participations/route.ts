import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/supabase";
import { getAllParticipations } from "@/lib/db/participations";
import { getAllChallenges } from "@/lib/db/challenges";

// GET /api/admin/participations - 모든 참여 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { isAdmin } = await getSessionFromCookie(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let participations: Awaited<ReturnType<typeof getAllParticipations>> = [];
    let challenges: Awaited<ReturnType<typeof getAllChallenges>> = [];

    try {
      [participations, challenges] = await Promise.all([
        getAllParticipations(),
        getAllChallenges(),
      ]);
    } catch (e) {
      console.error("Error fetching data:", e);
      // 에러 발생해도 빈 배열로 진행
    }

    // 배열인지 확인
    if (!Array.isArray(participations)) participations = [];
    if (!Array.isArray(challenges)) challenges = [];

    // 챌린지 정보를 맵으로 변환
    const challengeMap = new Map(
      challenges.map((c) => [c.id, { title: c.title, platform: c.platform, productImage: c.productImage }])
    );

    // 참여에 챌린지 정보 추가
    const participationsWithChallenge = participations.map((p) => ({
      ...p,
      challenge: challengeMap.get(p.challengeId) || null,
    }));

    // 최신순 정렬
    participationsWithChallenge.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(participationsWithChallenge);
  } catch (error) {
    console.error("Failed to fetch participations:", error);
    return NextResponse.json([], { status: 200 }); // 에러시에도 빈 배열 반환
  }
}
