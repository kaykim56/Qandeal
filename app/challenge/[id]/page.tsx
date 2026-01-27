// 챌린지 상세 페이지 - 챌린저스 스타일 + QANDA 브랜드 색상
// Next.js App Router + Tailwind CSS

// 캐싱 비활성화 - 항상 최신 데이터 가져오기
export const dynamic = "force-dynamic";

import { getChallengeById } from "@/lib/google-sheets";
import { notFound } from "next/navigation";
import ChallengeContent from "@/components/ChallengeContent";
import ShareButton from "@/components/ShareButton";
import BackButton from "@/components/BackButton";
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

  // Google Sheets 연동 전에는 더미 데이터 사용
  let challenge;
  try {
    challenge = await getChallengeById(id);
  } catch {
    // API 연동 전 또는 에러 시 더미 데이터
    challenge = null;
  }

  // 더미 데이터 (Sheets 연동 전)
  if (!challenge) {
    challenge = {
      id: "1",
      platform: "카카오 선물하기",
      title: "수플린 달콤한 설향 딸기 800g 구매하기",
      option: "특품(24~30입) *1개",
      purchaseDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      reviewDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      originalPrice: 30000,
      paybackRate: 40,
      paybackAmount: 12000,
      finalPrice: 18000,
      productImage: "",
      productLink: "https://gift.kakao.com/product/11944600",
      detailImages: [],
      missionSteps: undefined, // 기본 스텝 사용
      status: "published" as const,
      createdAt: "",
      updatedAt: "",
    };
  }

  // 삭제된 챌린지는 404
  if (challenge.status === "deleted") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
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
