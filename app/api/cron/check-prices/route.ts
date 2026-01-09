import { NextRequest, NextResponse } from "next/server";
import { getAllChallenges, updateChallenge } from "@/lib/google-sheets";

// Vercel Cron Job을 위한 인증
const CRON_SECRET = process.env.CRON_SECRET;

interface PriceCheckResult {
  id: string;
  title: string;
  oldPrice: number;
  newPrice: number;
  changed: boolean;
  error?: string;
}

// GET /api/cron/check-prices - 매일 가격 체크 (Cron Job)
export async function GET(request: NextRequest) {
  // Cron 인증 확인 (Vercel Cron은 Authorization 헤더로 인증)
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const challenges = await getAllChallenges();
    // 게시된 챌린지만 체크
    const publishedChallenges = challenges.filter((c) => c.status === "published");

    const results: PriceCheckResult[] = [];
    const priceChanges: PriceCheckResult[] = [];

    for (const challenge of publishedChallenges) {
      if (!challenge.productLink) continue;

      try {
        // 제품 정보 fetch
        const response = await fetch(`${getBaseUrl(request)}/api/fetch-product`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: challenge.productLink }),
        });

        const data = await response.json();

        if (data.price && data.price !== challenge.originalPrice) {
          // 가격 변동 감지!
          const result: PriceCheckResult = {
            id: challenge.id,
            title: challenge.title,
            oldPrice: challenge.originalPrice,
            newPrice: data.price,
            changed: true,
          };

          // 가격 업데이트
          await updateChallenge(challenge.id, {
            originalPrice: data.price,
          });

          priceChanges.push(result);
          results.push(result);
        } else {
          results.push({
            id: challenge.id,
            title: challenge.title,
            oldPrice: challenge.originalPrice,
            newPrice: data.price || challenge.originalPrice,
            changed: false,
          });
        }

        // Rate limiting - 요청 간 1초 대기
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          id: challenge.id,
          title: challenge.title,
          oldPrice: challenge.originalPrice,
          newPrice: 0,
          changed: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // 가격 변동이 있으면 로그 (나중에 슬랙 알림 등 추가 가능)
    if (priceChanges.length > 0) {
      console.log("=== 가격 변동 감지 ===");
      priceChanges.forEach((change) => {
        console.log(
          `[${change.title}] ${change.oldPrice.toLocaleString()}원 → ${change.newPrice.toLocaleString()}원`
        );
      });
    }

    return NextResponse.json({
      success: true,
      checked: results.length,
      changed: priceChanges.length,
      priceChanges,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Price check failed:", error);
    return NextResponse.json(
      { error: "Price check failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// 현재 호스트 URL 가져오기
function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}
