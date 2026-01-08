"use client";

import { ChevronLeft, Share2, Info, Clock } from "lucide-react";

interface ChallengePreviewProps {
  data: {
    platform: string;
    title: string;
    option: string;
    purchaseTimeLimit: string;
    originalPrice: number;
    paybackRate: number;
    paybackAmount: number;
    finalPrice: number;
    productImage: string;
    productLink: string;
  };
}

export default function ChallengePreview({ data }: ChallengePreviewProps) {
  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "미정";
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} 하루 동안`;
  };

  return (
    <div className="bg-gray-100 rounded-xl overflow-hidden shadow-lg border border-gray-200">
      {/* 모바일 프레임 */}
      <div className="bg-white max-w-[375px] mx-auto relative">
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
            className="inline-block px-2.5 py-1 text-xs font-medium rounded mb-3"
            style={{ backgroundColor: "#fff4e5", color: "#cc4400" }}
          >
            {data.platform || "플랫폼"}
          </span>

          <h1 className="text-lg font-bold text-gray-900 mb-2">
            {data.title || "제품 제목을 입력하세요"}
          </h1>

          <p className="text-sm text-gray-500 mb-4 whitespace-pre-wrap">
            옵션 지정 | {data.option || "옵션 정보"}
          </p>

          {/* 가격 정보 테이블 */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                구매 시간
              </span>
              <span className="text-sm font-medium text-gray-900">
                {formatDate(data.purchaseTimeLimit)}
              </span>
            </div>

            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">구매가</span>
              <span className="text-sm text-gray-900">
                {(data.originalPrice || 0).toLocaleString()}원
              </span>
            </div>

            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                페이백
                <Info className="w-3.5 h-3.5 text-gray-400" />
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
                <Info className="w-3.5 h-3.5" style={{ color: "#cc4400" }} />
              </span>
              <span className="text-base font-bold text-gray-900">
                {(data.finalPrice || 0).toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 버튼 그룹 */}
          <div className="flex gap-3 mt-4">
            <button className="flex-1 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
              제품 바로가기
            </button>
            <button
              className="flex-1 py-3 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: "#ff6600" }}
            >
              참가하기
            </button>
          </div>
        </section>

        {/* 미션 섹션 (간략히) */}
        <section className="bg-white px-4 py-5">
          <div className="flex items-center gap-3 mb-4">
            <span
              className="flex items-center justify-center w-6 h-6 text-white text-xs font-bold rounded-full"
              style={{ backgroundColor: "#ff6600" }}
            >
              1
            </span>
            <span className="text-base font-semibold text-gray-900">구매 인증하기</span>
          </div>
          <div className="pl-9 text-sm text-gray-500">
            <p>1) 제품을 &apos;나에게 선물하기&apos;로 구매해주세요.</p>
            <p className="mt-1">2) 주문 상세정보를 캡처해주세요.</p>
          </div>
        </section>

        {/* 하단 CTA 미리보기 */}
        <div className="bg-white border-t border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎉</span>
            <p className="text-sm text-gray-700">
              <span className="font-bold" style={{ color: "#ff6600" }}>
                {(data.paybackAmount || 0).toLocaleString()}원 페이백!
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700">
              제품 바로가기
            </button>
            <button
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
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
