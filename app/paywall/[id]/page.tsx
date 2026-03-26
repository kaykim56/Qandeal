"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CouponPopupModal from "@/components/CouponPopupModal";

const COUPONS = [
  { id: 1, image: "/coupon_1.png", category: "편의점", name: "GS25" },
  { id: 2, image: "/coupon_2.png", category: "편의점", name: "세븐일레븐" },
  { id: 3, image: "/coupon_3.png", category: "생활용품", name: "다이소" },
  { id: 4, image: "/coupon_4.png", category: "간편결제", name: "네이버페이" },
  { id: 5, image: "/coupon_5.png", category: "뷰티", name: "올리브영" },
  { id: 6, image: "/coupon_6.png", category: "배달앱", name: "배달의민족" },
];

export default function PaywallPage() {
  const { id } = useParams();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number>(1);
  const [showPopup, setShowPopup] = useState(true);

  const handleSelect = (couponId: number) => {
    setSelectedId(couponId);
  };

  const handleSubmit = () => {
    // TODO: 쿠폰 선택 정보 저장 후 챌린지 상세로 이동
    router.push(`/challenge/${id}`);
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* 헤더 */}
      <header className="shrink-0 h-[48px] flex items-center justify-center overflow-hidden bg-white">
        <img
          src="/콴딜_로고_배경제거.png"
          alt="콴딜 로고"
          className="w-[280px] h-auto block"
        />
      </header>

      <div className="px-4">
        {/* 캐릭터 이미지 */}
        <div className="mt-0 flex justify-center overflow-hidden">
          <img
            src="/friends_all.png"
            alt="콴다 프렌즈"
            className="friends-hop"
            style={{ width: "340px", height: "auto", marginTop: "-38%", marginBottom: "-38%" }}
          />
        </div>

        {/* 말풍선 */}
        <div className="flex justify-center mb-[14px] -mt-1">
          <div className="relative bg-[#f5f5f5] rounded-2xl px-12 py-2.5">
            {/* 말풍선 꼬리 (상단 중앙) */}
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderBottom: "8px solid #f5f5f5",
              }}
            />
            <h2 className="text-[15px] font-black leading-[1.4] text-[#111] text-center">
              갖고 싶은 쿠폰을 골라봐.
            </h2>
            <p className="text-xs text-[#666] mt-[2px] text-center">
              구매와 리뷰를 인증하면 쿠폰으로 지급돼요
            </p>
          </div>
        </div>

        {/* 쿠폰 그리드 */}
        <div className="grid grid-cols-2 gap-[14px]">
          {COUPONS.map((coupon) => {
            const isSelected = selectedId === coupon.id;
            return (
              <div
                key={coupon.id}
                onClick={() => handleSelect(coupon.id)}
                className={`bg-white rounded-[18px] overflow-hidden cursor-pointer transition-all duration-150 relative
                  ${
                    isSelected
                      ? "border-[2.5px] border-[#FF6B35] shadow-[0_0_0_3px_rgba(255,107,53,0.15)]"
                      : "border-[2.5px] border-[#eee] hover:border-[#FF6B35] hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(255,107,53,0.18)]"
                  }`}
              >
                {/* 선택 체크 */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-[#FF6B35] rounded-full flex items-center justify-center text-white text-[13px] font-bold z-[2]">
                    ✓
                  </div>
                )}

                {/* 쿠폰 이미지 */}
                <div className="w-full h-[162px] overflow-hidden bg-[#f5f5f5] border-b border-[#f0f0f0]">
                  <img
                    src={coupon.image}
                    alt={`${coupon.name} 상품권`}
                    className="w-full h-full object-contain p-[6px]"
                  />
                </div>

                {/* 쿠폰 정보 */}
                <div className="px-3 py-[10px] pb-3">
                  <div className="text-[11px] text-[#888] mb-[2px]">
                    {coupon.category}
                  </div>
                  <div className="text-sm font-bold text-[#111]">
                    {coupon.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-white border-t border-[#f0f0f0] max-w-[430px] mx-auto">
        <button
          onClick={handleSubmit}
          className="w-full py-[17px] bg-[#FF6B35] text-white text-base font-black border-none rounded-[14px] cursor-pointer tracking-[0.3px] transition-all duration-150 active:scale-[0.98] active:bg-[#e55a25]"
        >
          이 쿠폰으로 참가하기 →
        </button>
      </div>

      {/* 쿠폰 안내 팝업 */}
      {showPopup && (
        <CouponPopupModal onConfirm={() => setShowPopup(false)} />
      )}
    </div>
  );
}
