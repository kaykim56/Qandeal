// 챌린지 상세 페이지 - 챌린저스 스타일 + QANDA 브랜드 색상
// Next.js App Router + Tailwind CSS

// 캐싱 비활성화 - 항상 최신 데이터 가져오기
export const dynamic = "force-dynamic";

import { getChallengeById } from "@/lib/db/challenges";
import { notFound } from "next/navigation";
import ChallengeContent from "@/components/ChallengeContent";
import ShareButton from "@/components/ShareButton";
import BackButton from "@/components/BackButton";
import DeepLinkRedirect from "@/components/DeepLinkRedirect";
import type { Metadata } from "next";

// QANDA 브랜드 색상
// 메인 오렌지: #ff6600
// 연한 오렌지: #fff4e5
// 진한 오렌지: #cc4400

interface PageProps {
  params: Promise<{ id: string }>;
}

// 동적 OG 태그 생성
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const challenge = await getChallengeById(id);

  if (!challenge) {
    return { title: "챌린지를 찾을 수 없습니다" };
  }

  return {
    title: challenge.title,
    description: `${challenge.paybackRate}% 페이백 | 실구매가 ${challenge.finalPrice.toLocaleString()}원`,
    openGraph: {
      title: challenge.title,
      description: `${challenge.paybackRate}% 페이백 | 실구매가 ${challenge.finalPrice.toLocaleString()}원`,
      images: challenge.productImage ? [challenge.productImage] : [],
    },
  };
}

export default async function ChallengeDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Supabase에서 챌린지 조회
  let challenge;
  try {
    challenge = await getChallengeById(id);
  } catch {
    challenge = null;
  }

  // 챌린지를 찾을 수 없거나 삭제된 경우 404
  if (!challenge || challenge.status === "deleted") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 콴다 앱 딥링크 리다이렉트 */}
      <DeepLinkRedirect challengeId={challenge.id} />

      {/* 상단 헤더 */}
      <header className="sticky top-0 z-10 bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <BackButton />
        <ShareButton title={challenge.title} />
      </header>

      {/* 제품 이미지 */}
      <section className="bg-white">
        <div className="aspect-square bg-gray-200 flex items-center justify-center overflow-hidden">
          {challenge.productImage ? (
            <img
              src={challenge.productImage}
              alt={challenge.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-gray-400 text-sm">제품 이미지</div>
          )}
        </div>
      </section>

      {/* 제품 정보 + 미션 스텝 + CTA (클라이언트 컴포넌트) */}
      <ChallengeContent
        challenge={{
          id: challenge.id,
          platform: challenge.platform,
          title: challenge.title,
          option: challenge.option,
          purchaseDeadline: challenge.purchaseDeadline,
          reviewDeadline: challenge.reviewDeadline,
          originalPrice: challenge.originalPrice,
          paybackRate: challenge.paybackRate,
          paybackAmount: challenge.paybackAmount,
          finalPrice: challenge.finalPrice,
          productLink: challenge.productLink,
          detailImages: challenge.detailImages,
          missionSteps: challenge.missionSteps,
        }}
      />
    </div>
  );
}
