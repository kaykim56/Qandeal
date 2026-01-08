// 챌린지 상세 페이지 - 챌린저스 스타일 + QANDA 브랜드 색상
// Next.js App Router + Tailwind CSS

import { ChevronLeft, Share2, Info, Clock } from "lucide-react";
import { getChallengeById } from "@/lib/google-sheets";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Mission } from "@/lib/types";

// QANDA 브랜드 색상
// 메인 오렌지: #ff6600
// 연한 오렌지: #fff4e5
// 진한 오렌지: #cc4400

interface PageProps {
  params: Promise<{ id: string }>;
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
      purchaseTimeLimit: "1/8 하루 동안",
      originalPrice: 30000,
      paybackRate: 40,
      paybackAmount: 12000,
      finalPrice: 18000,
      productImage: "",
      productLink: "#",
      status: "published" as const,
      createdAt: "",
      updatedAt: "",
      missions: [
        {
          id: "mission-1",
          challengeId: "1",
          order: 1,
          title: "구매 인증하기",
          steps: [
            "제품을 '나에게 선물하기'로 구매해주세요.",
            "🚨 판매가가 다를 경우 구매 페이지의 가격은 구매 당일에 변경돼요.",
            "[선물하기] > 주문내역 > 상세보기]로 이동해주세요.",
            "주문일, 주문번호, 주문상품이 보이도록 주문 상세정보를 캡처해주세요.",
            "캡처한 스크린샷을 앱에 인증해주세요.",
          ],
          note: "• 오후 11시 59분 59초 전까지 인증",
          exampleImage: null,
        },
        {
          id: "mission-2",
          challengeId: "1",
          order: 2,
          title: "제품 리뷰 인증하기",
          steps: [
            "제품을 개봉하여 사용/섭취한 사진이 포함된 포토리뷰를 작성해주세요.",
            "[선물함 > 선물 후기 > 작성한 후기]로 이동해주세요.",
            "해당 제품 리뷰를 캡처하여 앱에 인증해주세요.",
          ],
          note: null,
          exampleImage: null,
        },
      ],
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
        <button className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <Share2 className="w-5 h-5 text-gray-700" />
        </button>
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

      {/* 제품 정보 카드 */}
      <section className="bg-white px-4 py-5 border-b border-gray-100">
        {/* 플랫폼 태그 */}
        <span
          className="inline-block px-2.5 py-1 text-xs font-medium rounded mb-3"
          style={{ backgroundColor: "#fff4e5", color: "#cc4400" }}
        >
          {challenge.platform}
        </span>

        <h1 className="text-lg font-bold text-gray-900 mb-2">{challenge.title}</h1>

        <p className="text-sm text-gray-500 mb-4">옵션 지정 | {challenge.option}</p>

        {/* 가격 정보 테이블 */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              구매 시간
            </span>
            <span className="text-sm font-medium text-gray-900">
              {challenge.purchaseTimeLimit}
            </span>
          </div>

          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <span className="text-sm text-gray-600">구매가</span>
            <span className="text-sm text-gray-900">
              {challenge.originalPrice.toLocaleString()}원
            </span>
          </div>

          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              페이백
              <Info className="w-3.5 h-3.5 text-gray-400" />
            </span>
            <span className="text-sm">
              <span style={{ color: "#ff6600" }} className="font-semibold mr-1">
                {challenge.paybackRate}%
              </span>
              <span style={{ color: "#ff6600" }} className="font-semibold">
                {challenge.paybackAmount.toLocaleString()}원
              </span>
            </span>
          </div>

          <div
            className="flex justify-between items-center px-4 py-3"
            style={{ backgroundColor: "#fff4e5" }}
          >
            <span className="text-sm flex items-center gap-1" style={{ color: "#cc4400" }}>
              실구매가
              <Info className="w-3.5 h-3.5" style={{ color: "#cc4400" }} />
            </span>
            <span className="text-base font-bold text-gray-900">
              {challenge.finalPrice.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* 버튼 그룹 */}
        <div className="flex gap-3 mt-4">
          <Link
            href={challenge.productLink || "#"}
            target="_blank"
            className="flex-1 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center"
          >
            제품 바로가기
          </Link>
          <button
            className="flex-1 py-3 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: "#ff6600" }}
          >
            참가하기
          </button>
        </div>
      </section>

      {/* 미션 섹션 */}
      <section className="mt-2 bg-white">
        {challenge.missions.map((mission, index) => (
          <MissionCard key={mission.id} mission={mission} index={index + 1} />
        ))}
      </section>

      {/* 하단 고정 CTA */}
      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-200 px-4 py-3 z-20">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🎉</span>
          <p className="text-sm text-gray-700">
            <span className="font-bold" style={{ color: "#ff6600" }}>
              {challenge.paybackAmount.toLocaleString()}원 페이백!
            </span>
            <span className="ml-1 text-gray-500">인증샷 검토 후 받을 수 있어요.</span>
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={challenge.productLink || "#"}
            target="_blank"
            className="flex-1 py-3.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-center"
          >
            제품 바로가기
          </Link>
          <button
            className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#ff6600" }}
          >
            참가하기
          </button>
        </div>
      </footer>
    </div>
  );
}

// 미션 카드 컴포넌트
interface MissionCardProps {
  mission: Mission;
  index: number;
}

function MissionCard({ mission, index }: MissionCardProps) {
  return (
    <div className="border-b border-gray-100 last:border-b-0 px-4 py-5">
      {/* 미션 헤더 */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className="flex items-center justify-center w-6 h-6 text-white text-xs font-bold rounded-full"
          style={{ backgroundColor: "#ff6600" }}
        >
          {index}
        </span>
        <span className="text-base font-semibold text-gray-900">{mission.title}</span>
      </div>

      {/* 단계별 설명 */}
      <div className="pl-9 space-y-2">
        {mission.steps.map((step, idx) => (
          <p
            key={idx}
            className="text-sm leading-relaxed"
            style={{ color: step.startsWith("🚨") ? "#ff6600" : "#6b7280" }}
          >
            {!step.startsWith("🚨") && !step.startsWith("•") && `${idx + 1}) `}
            {step}
          </p>
        ))}

        {mission.note && <p className="text-sm text-gray-500 mt-2">{mission.note}</p>}
      </div>

      {/* 예시 이미지 영역 */}
      <div className="mt-4 ml-9">
        <div
          className="relative bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden"
          style={{ aspectRatio: "9/16" }}
        >
          {mission.exampleImage ? (
            <img
              src={mission.exampleImage}
              alt="인증샷 예시"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-gray-400 text-sm">스크린샷 예시</div>
          )}

          {/* 우측 하단 라벨 */}
          <div
            className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg text-white text-xs font-medium flex items-center gap-1.5"
            style={{ backgroundColor: "rgba(255, 102, 0, 0.9)" }}
          >
            <span>📷</span>
            <span>인증샷 예시</span>
          </div>
        </div>
      </div>
    </div>
  );
}
