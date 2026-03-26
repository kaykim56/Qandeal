"use client";

interface CouponPopupModalProps {
  onConfirm: () => void;
}

export default function CouponPopupModal({ onConfirm }: CouponPopupModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-[fadeIn_0.25s_ease]"
      style={{ background: "rgba(0,0,0,0.82)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-3xl max-w-[370px] w-full overflow-hidden animate-[slideUp_0.3s_ease] shadow-[0_20px_60px_rgba(0,0,0,0.3),0_0_80px_rgba(255,180,50,0.15)]">
        {/* 상단 — 골드 티켓 영역 */}
        <div className="relative overflow-hidden text-center px-6 pt-8 pb-7 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#1a1a2e]">
          {/* 배경 shimmer */}
          <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-[shimmer_3s_ease-in-out_infinite] bg-[radial-gradient(ellipse_at_center,rgba(255,200,50,0.12)_0%,transparent_60%)]" />

          {/* 반짝이 */}
          <div className="absolute inset-0 pointer-events-none">
            {["top-[12%] left-[10%]", "top-[18%] right-[12%]", "bottom-[15%] left-[15%]", "bottom-[20%] right-[10%]", "top-[45%] left-[5%] text-[10px]", "top-[40%] right-[6%] text-[10px]"].map((pos, i) => (
              <span
                key={i}
                className={`absolute text-sm text-white ${pos}`}
                style={{ animation: `sparkle 2s ease-in-out infinite ${i * 0.3}s` }}
              >
                ✦
              </span>
            ))}
          </div>

          {/* 골드 쿠폰 티켓 */}
          <div className="relative z-[1] w-40 h-[100px] mx-auto mb-4 rounded-[14px] flex items-center justify-center bg-gradient-to-br from-[#FFD700] via-[#FFC107] to-[#FFD700] shadow-[0_8px_32px_rgba(255,193,7,0.4),inset_0_1px_0_rgba(255,255,255,0.5)] border-2 border-white/30">
            {/* 좌우 노치 */}
            <div className="absolute w-5 h-5 rounded-full bg-[#1a1a2e] top-1/2 -translate-y-1/2 -left-3" />
            <div className="absolute w-5 h-5 rounded-full bg-[#1a1a2e] top-1/2 -translate-y-1/2 -right-3" />
            <div className="border-[1.5px] border-dashed border-[rgba(139,101,8,0.4)] rounded-lg px-6 py-2.5 text-center">
              <span className="text-[32px] block drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]">🎟️</span>
              <div className="text-[11px] font-black text-[#7a5a00] tracking-[2px] mt-0.5">GOLD COUPON</div>
            </div>
          </div>

          <h3 className="relative z-[1] text-white text-[17px] font-black leading-[1.55] [text-shadow:0_1px_8px_rgba(0,0,0,0.3)]">
            페이백 원하는 쿠폰을 선택하고<br />인증을 완료하면 쿠폰이 지급 돼요.
          </h3>
        </div>

        {/* 하단 — 스텝 + 버튼 */}
        <div className="px-6 pt-[22px] pb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-5">
            {[
              { num: 1, label: "쿠폰 선택" },
              { num: 2, label: "구매&인증" },
              { num: 3, label: "쿠폰 지급" },
            ].map((step, i) => (
              <div key={step.num} className="flex items-center gap-2">
                {i > 0 && <span className="text-[10px] text-[#ccc]">→</span>}
                <div className="flex items-center gap-[5px]">
                  <span className="w-5 h-5 bg-[#FF6B35] text-white rounded-full text-[11px] font-black flex items-center justify-center">
                    {step.num}
                  </span>
                  <span className="text-xs text-[#666] font-bold">{step.label}</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onConfirm}
            className="w-full py-[15px] bg-gradient-to-br from-[#FF6B35] to-[#FF9A3C] text-white text-[15px] font-black border-none rounded-xl cursor-pointer tracking-[0.3px] transition-transform duration-100 active:scale-[0.97]"
          >
            확인했어요!
          </button>
        </div>
      </div>
    </div>
  );
}
