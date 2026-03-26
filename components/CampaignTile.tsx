"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CouponPopupModal from "./CouponPopupModal";

interface CampaignTileProps {
  id: string;
  platform: string;
  title: string;
  originalPrice: number;
  paybackAmount: number;
  productImage: string;
  characterImage: string;
  characterBg: string;
  characterName: string;
  characterMotion: string;
}

export default function CampaignTile({
  id,
  platform,
  title,
  originalPrice,
  paybackAmount,
  productImage,
  characterImage,
  characterBg,
  characterName,
  characterMotion,
}: CampaignTileProps) {
  const [unlocked, setUnlocked] = useState(false);
  const router = useRouter();

  const finalPrice = originalPrice - paybackAmount;

  const handleClick = () => {
    if (unlocked) {
      router.push(`/paywall/${id}`);
    } else {
      setUnlocked(true);
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        className={`w-[calc(50%-5px)] rounded-2xl overflow-hidden relative cursor-pointer transition-transform duration-150 active:scale-[0.97] ${
          unlocked
            ? "bg-white border-2 border-[#e0e0e0] unlock-animate"
            : "border-2 border-transparent aspect-[3/4] flex flex-col items-center justify-end pb-3"
        }`}
        style={!unlocked ? { backgroundColor: characterBg } : undefined}
      >
        {!unlocked ? (
          <>
            {/* ? 마크 + 펄스 */}
            <div className="absolute top-[22px] left-1/2 -translate-x-1/2 z-[2]">
              <div className="question-pulse" />
              <div className="relative w-[26px] h-[26px] rounded-full bg-[#FFCC00] flex items-center justify-center text-sm text-white font-extrabold">
                ?
              </div>
            </div>
            {/* 캐릭터 */}
            <img
              src={characterImage}
              alt={characterName}
              className={`tokgu-character ${characterMotion}`}
            />
          </>
        ) : (
          <>
            {/* 열린 상태: 상품 정보 */}
            {/* 플랫폼 배지 */}
            <div className="absolute top-2 left-2 bg-white/90 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold text-[#111] tracking-wide z-[2]">
              {platform}
            </div>
            {/* 상품 이미지 — 1:1 정사각형, contain */}
            <div className="w-full aspect-square bg-[#f5f5f5] overflow-hidden">
              {productImage ? (
                <img
                  src={productImage}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#f5f5f5] flex items-center justify-center">
                  <span className="text-3xl">🎁</span>
                </div>
              )}
            </div>
            {/* 상품 정보 */}
            <div className="px-2.5 py-2 pb-2.5 bg-white">
              <h2 className="text-[13px] font-bold text-[#111] mb-1 line-clamp-2">
                {title}
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-[#888] line-through">
                    {originalPrice.toLocaleString()}원
                  </p>
                  <p className="text-base font-black text-[#ff6b1a]">
                    {finalPrice.toLocaleString()}원
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

    </>
  );
}
