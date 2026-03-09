"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Share2, Info, Clock } from "lucide-react";
import { MissionStep } from "@/lib/types";

// 번호 목록을 파싱하여 렌더링하는 컴포넌트
function FormattedDescription({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  const numberedPattern = /^(\d+)\.\s+(.+)$/;

  // 모든 줄이 번호로 시작하는지 확인
  const allNumbered = lines.every(line => line.trim() === "" || numberedPattern.test(line.trim()));

  if (allNumbered && lines.some(line => numberedPattern.test(line.trim()))) {
    const items = lines
      .filter(line => numberedPattern.test(line.trim()))
      .map(line => {
        const match = line.trim().match(numberedPattern);
        return match ? match[2] : line;
      });

    return (
      <div className={`space-y-0.5 ${className || ""}`}>
        {items.map((item, idx) => (
          <div key={idx} className="flex">
            <span className="flex-shrink-0 w-5">{idx + 1}.</span>
            <span className="flex-1">{item}</span>
          </div>
        ))}
      </div>
    );
  }

  // 번호 목록이 아니면 기존처럼 줄바꿈만 적용
  return <p className={`whitespace-pre-line ${className || ""}`}>{text}</p>;
}

interface ChallengePreviewProps {
  data: {
    platform: string;
    title: string;
    option: string;
    purchaseDeadline: string;
    originalPrice: number;
    paybackRate: number;
    paybackAmount: number;
    finalPrice: number;
    productImage: string;
    productLink: string;
    detailImages?: string[];
    missionSteps?: MissionStep[];
  };
}

export default function ChallengePreview({ data }: ChallengePreviewProps) {
  const [showPaybackTooltip, setShowPaybackTooltip] = useState(false);
  const [showFinalPriceTooltip, setShowFinalPriceTooltip] = useState(false);

  // 툴팁 자동 닫기 (5초)
  useEffect(() => {
    if (showPaybackTooltip) {
      const timer = setTimeout(() => setShowPaybackTooltip(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showPaybackTooltip]);

  useEffect(() => {
    if (showFinalPriceTooltip) {
      const timer = setTimeout(() => setShowFinalPriceTooltip(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showFinalPriceTooltip]);

  // 동적 스텝 또는 기본 스텝
  const missionSteps: MissionStep[] = data.missionSteps && data.missionSteps.length > 0
    ? data.missionSteps
    : [
        {
          order: 1,
          title: "구매 인증하기",
          description: "주문일, 주문번호, 주문상품이 보이도록 주문 상세정보를 캡처해주세요.",
          exampleImages: [],
          deadline: data.purchaseDeadline,
        },
        {
          order: 2,
          title: "리뷰 인증하기",
          description: "구매처에 작성한 포토리뷰 화면을 캡처해주세요.",
          exampleImages: [],
          deadline: "",
        },
      ];

  // 첫 번째 스텝의 기한 (가격 정보에 표시)
  const firstStepDeadline = missionSteps[0]?.deadline || data.purchaseDeadline;

  // 날짜 범위 포맷 (deadline 하루 전 ~ deadline) - 실제 페이지와 동일
  const formatDeadlineRange = (dateStr: string) => {
    if (!dateStr) return "미정";
    try {
      const endDate = new Date(dateStr);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 1);

      const startMonth = startDate.getMonth() + 1;
      const startDay = startDate.getDate();
      const endMonth = endDate.getMonth() + 1;
      const endDay = endDate.getDate();

      return `${startMonth}/${startDay}-${endMonth}/${endDay}`;
    } catch {
      return "미정";
    }
  };

  // 날짜 포맷 (M/D(요일))
  const formatDeadline = (dateStr: string) => {
    if (!dateStr) return "미정";
    try {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
      const dayName = dayNames[date.getDay()];
      return `${month}/${day}(${dayName})`;
    } catch {
      return "미정";
    }
  };

  return (
    <div className="bg-gray-100 rounded-xl overflow-hidden shadow-lg border border-gray-200">
      {/* 모바일 프레임 */}
      <div className="bg-gray-50 max-w-[375px] mx-auto relative pb-24">
        {/* 상단 헤더 */}
        <header className="sticky top-0 z-10 bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <button className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <button className="p-2">
            <Share2 className="w-5 h-5 text-gray-700" />
          </button>
        </header>

        {/* 제품 이미지 */}
        <section className="bg-white">
          <div className="aspect-square bg-gray-200 flex items-center justify-center overflow-hidden">
            {data.productImage ? (
              <img
                src={data.productImage}
                alt={data.title || "제품 이미지"}
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
            className={`inline-block px-2.5 py-1 text-xs font-medium rounded mb-3 ${
              data.platform?.includes("스마트스토어")
                ? "bg-[#03C75A] text-white"
                : data.platform?.includes("쿠팡")
                ? "bg-blue-500 text-white"
                : data.platform?.includes("카카오")
                ? "bg-yellow-400 text-yellow-900"
                : data.platform?.includes("올리브영")
                ? "bg-green-600 text-white"
                : ""
            }`}
            style={
              !data.platform?.includes("스마트스토어") &&
              !data.platform?.includes("쿠팡") &&
              !data.platform?.includes("카카오") &&
              !data.platform?.includes("올리브영")
                ? { backgroundColor: "#fff4e5", color: "#cc4400" }
                : undefined
            }
          >
            {data.platform || "플랫폼"}
          </span>

          <h1 className="text-lg font-bold text-gray-900 mb-2">
            {data.title || "제품 제목을 입력하세요"}
          </h1>

          <p className="text-sm text-gray-500 mb-4 whitespace-pre-wrap">
            {data.option ? (
              <>
                <span className="inline-block px-1.5 py-0.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded mr-1.5">옵션 지정</span>
                {data.option}
              </>
            ) : "모든 옵션이 페이백 대상입니다"}
          </p>

          {/* 카카오 선물하기 안내 */}
          {data.platform === "카카오 선물하기" && (
            <div className="px-3 py-2.5 rounded-lg mb-4 bg-gray-100">
              <p className="text-sm font-medium text-gray-700">
                &apos;나에게 선물&apos;로만 참여가 가능합니다.
              </p>
            </div>
          )}

          {/* 구매 시간 강조 (실제 페이지와 동일) */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-lg mb-3"
            style={{ backgroundColor: "#ffdfb8" }}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" style={{ color: "#cc4400" }} />
              <span className="font-bold" style={{ color: "#cc4400" }}>구매 시간</span>
            </div>
            <span className="font-bold text-lg" style={{ color: "#cc4400" }}>
              {formatDeadlineRange(firstStepDeadline)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3 text-center">
            ⚠️ 위 날짜에 구매하고, 당일 인증해야 페이백을 받을 수 있어요!
          </p>

          {/* 가격 정보 테이블 */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">구매가</span>
              <span className="text-sm text-gray-900">
                {(data.originalPrice || 0).toLocaleString()}원
              </span>
            </div>

            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                페이백
                <span className="relative">
                  <button
                    onClick={() => {
                      setShowFinalPriceTooltip(false);
                      setShowPaybackTooltip(!showPaybackTooltip);
                    }}
                    className="focus:outline-none"
                  >
                    <Info className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  {showPaybackTooltip && (
                    <div className="absolute left-0 bottom-full z-10 mb-2 whitespace-nowrap px-4 py-2.5 bg-gray-800 text-white text-xs rounded-lg shadow-lg text-center">
                      <div className="absolute -bottom-[6px] left-3 w-3 h-3 bg-gray-800 rotate-45" />
                      <span className="relative z-10">모든 인증 완료 시 환급드리는 금액입니다.</span>
                    </div>
                  )}
                </span>
              </span>
              <span className="text-sm">
                <span style={{ color: "#ff6600" }} className="font-semibold mr-1">
                  {data.paybackRate || 0}%
                </span>
                <span style={{ color: "#ff6600" }} className="font-semibold">
                  {(data.paybackAmount || 0).toLocaleString()}원
                </span>
              </span>
            </div>

            <div
              className="flex justify-between items-center px-4 py-3"
              style={{ backgroundColor: "#fff4e5" }}
            >
              <span className="text-sm flex items-center gap-1" style={{ color: "#cc4400" }}>
                실구매가
                <span className="relative">
                  <button
                    onClick={() => {
                      setShowPaybackTooltip(false);
                      setShowFinalPriceTooltip(!showFinalPriceTooltip);
                    }}
                    className="focus:outline-none"
                  >
                    <Info className="w-3.5 h-3.5" style={{ color: "#cc4400" }} />
                  </button>
                  {showFinalPriceTooltip && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 z-10 ml-2 whitespace-nowrap px-4 py-2.5 bg-gray-800 text-white text-xs rounded-lg shadow-lg">
                      <div className="absolute -left-[6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-800 rotate-45" />
                      <span className="relative z-10">환급 후 구매자의 실제 지출 금액입니다.</span>
                    </div>
                  )}
                </span>
              </span>
              <span className="text-base font-bold text-gray-900">
                {(data.finalPrice || 0).toLocaleString()}원
              </span>
            </div>
          </div>
        </section>

        {/* 네이버페이 쿠폰 카드 */}
        <section className="mt-2 bg-white px-4 py-6">
          <p className="text-center text-gray-800 font-medium mb-5">
            제품 구매 후 리뷰 인증하면{" "}
            <span style={{ color: "#ff6600" }} className="font-bold">
              {data.paybackRate || 0}%
            </span>
            를 돌려드려요!
          </p>

          <div className="flex items-center justify-center mb-6">
            <div
              className="relative overflow-hidden"
              style={{
                width: "100%",
                maxWidth: "340px",
                height: "200px",
                borderRadius: "24px",
                background: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 50%, #0f0f0f 100%)",
              }}
            >
              {/* 상단 - 콴다 페이백 */}
              <div className="absolute top-4 left-0 right-0 flex justify-center">
                <div
                  className="flex items-center gap-2"
                  style={{
                    backgroundColor: "#ffdfb8",
                    borderRadius: "24px",
                    padding: "6px 14px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#cc4400",
                  }}
                >
                  <img
                    src="/logo-qanda.png"
                    alt="콴다"
                    style={{ height: "18px" }}
                  />
                  <span>콴다에서 드리는 페이백</span>
                </div>
              </div>

              {/* 네이버페이 로고 (중앙) */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ marginTop: "-8px" }}
              >
                <img
                  src="/logo_naverpay.svg"
                  alt="네이버페이"
                  style={{ height: "48px" }}
                />
              </div>

              {/* 하단 영역 */}
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 flex justify-between items-end">
                <div className="flex flex-col">
                  <span style={{ color: "#808080", fontSize: "16px", fontWeight: "600" }}>
                    네이버페이
                  </span>
                  <span style={{ color: "#808080", fontSize: "16px", fontWeight: "600" }}>
                    포인트 쿠폰
                  </span>
                </div>
                <span className="text-white font-bold" style={{ fontSize: "32px" }}>
                  {(data.paybackAmount || 0).toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 페이백은 어떻게 받나요? */}
        <section className="bg-white px-4 pb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">페이백은 어떻게 받나요?</h3>
          <div className="space-y-4">
            {/* 참가하기 (항상 첫 번째) */}
            <div className="flex gap-3">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                style={{ backgroundColor: "#ff6600" }}
              >
                1
              </span>
              <div>
                <p className="font-medium text-gray-900 mb-1">참가하기</p>
                <p className="text-sm text-gray-500">하단의 참가하기 버튼을 눌러 챌린지에 참가</p>
              </div>
            </div>

            {/* 동적 미션 스텝들 */}
            {missionSteps.map((step, index) => (
              <div key={index}>
                <div className="flex gap-3">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                    style={{ backgroundColor: "#ff6600" }}
                  >
                    {index + 2}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900">{step.title}</p>
                      {step.deadline && (
                        <span className="text-xs text-orange-500">
                          {(step.title.includes("리뷰") || step.title.includes("구매확정")) ? formatDeadline(step.deadline) : formatDeadlineRange(step.deadline)}
                        </span>
                      )}
                    </div>
                    {step.title.includes("리뷰") && (
                      <div className="mb-3 p-3 bg-orange-50 border-2 border-orange-300 rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-bold text-orange-600">⚠️ 공정위 문구 작성 필수</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText("구매지원금을 받아 직접 구매 후 솔직한/주관적인 생각으로 작성하였습니다.");
                              alert("복사되었습니다!");
                            }}
                            className="px-2.5 py-1 bg-orange-500 text-white text-xs font-semibold rounded hover:bg-orange-600 transition-colors"
                          >
                            복사
                          </button>
                        </div>
                        <p className="text-sm font-medium text-orange-700 bg-white px-2 py-1.5 rounded border border-orange-200">[구매지원금을 받아 직접 구매 후 솔직한/주관적인 생각으로 작성하였습니다.]</p>
                      </div>
                    )}
                    <FormattedDescription text={step.description} className="text-sm text-gray-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">※ 모든 인증은 기한 내 업로드 필수</p>
        </section>

        {/* 상세 이미지 (다중) */}
        {data.detailImages && data.detailImages.length > 0 && (
          <section className="mt-2 bg-white">
            <div className="px-4 py-5">
              <h3 className="text-base font-semibold text-gray-900 mb-3">상품 상세 정보</h3>
              <div className="space-y-2">
                {data.detailImages.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`상품 상세 ${index + 1}`}
                    className="w-full rounded-lg"
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 하단 CTA 미리보기 */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎉</span>
            <p className="text-sm text-gray-700">
              <span className="font-bold" style={{ color: "#ff6600" }}>
                {(data.paybackAmount || 0).toLocaleString()}원 페이백!
              </span>
              <span className="ml-1 text-gray-500">인증샷 검토 후 받을 수 있어요.</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: "#3b82f6" }}
            >
              제품 바로가기
            </button>
            <button
              className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: "#ff6600" }}
            >
              참가하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
