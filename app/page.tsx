import { getAllChallenges } from "@/lib/db/challenges";
import { Challenge } from "@/lib/types";
import CampaignTile from "@/components/CampaignTile";

const CHARACTER_DATA = [
  { image: "/friend_star.png", bg: "#FFF8E1", name: "스타", motion: "char-bounce" },
  { image: "/friend_purple.png", bg: "#F3E5F5", name: "보라", motion: "char-float" },
  { image: "/friend_red.png", bg: "#FFEBEE", name: "빨강", motion: "char-wobble" },
  { image: "/friend_orange.png", bg: "#FFF3E0", name: "주황", motion: "char-nod" },
  { image: "/friend_green.png", bg: "#E8F5E9", name: "초록", motion: "char-sway" },
  { image: "/friend_blue.png", bg: "#E3F2FD", name: "파랑", motion: "char-breathe" },
];

// 페이지를 항상 동적으로 렌더링 (캐시 비활성화)
export const dynamic = "force-dynamic";

export default async function Home() {
  let challenges: Challenge[] = [];

  try {
    const allChallenges = await getAllChallenges();
    challenges = allChallenges.filter((c) => c.status === "published");
  } catch (error) {
    console.error("Failed to fetch challenges:", error);
  }


  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* 헤더 — sticky 상단 고정 */}
      <header className="shrink-0 h-[48px] flex items-center justify-center overflow-hidden bg-white">
        <img
          src="/콴딜_로고_배경제거.png"
          alt="콴딜 로고"
          className="w-[280px] h-auto block"
        />
      </header>

      {/* 액션 버튼 — sticky 상단 고정 */}
      <div className="shrink-0 grid grid-cols-2 gap-[10px] px-4 py-[14px] bg-white">
        <button className="flex items-center justify-center gap-[7px] py-[11px] rounded-[14px] border-[1.5px] border-[#e0e0e0] bg-white text-[14px] font-semibold text-[#111] cursor-pointer">
          🛒 참여중
          {challenges.length > 0 && (
            <span className="bg-[#ff6b1a] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {challenges.length}
            </span>
          )}
        </button>
        <button className="flex items-center justify-center gap-[7px] py-[11px] rounded-[14px] border-[1.5px] border-[#e0e0e0] bg-white text-[14px] font-semibold text-[#111] cursor-pointer">
          💰 페이백 현황
        </button>
      </div>

      {/* 스크롤 영역 — 카드 + 더보기 버튼 */}
      <main className="flex-1 overflow-y-scroll px-3">
        {challenges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-4">🎁</div>
            <p className="text-[#888]">현재 진행 중인 딜이 없습니다</p>
            <p className="text-sm text-[#aaa] mt-1">
              곧 새로운 딜이 올라올 예정이에요!
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-[10px]">
            {challenges.map((challenge, index) => (
              <CampaignTile
                key={challenge.id}
                id={challenge.id}
                platform={challenge.platform}
                title={challenge.title}
                originalPrice={challenge.originalPrice}
                paybackAmount={challenge.paybackAmount}
                productImage={challenge.productImage}
                characterImage={CHARACTER_DATA[index % CHARACTER_DATA.length].image}
                characterBg={CHARACTER_DATA[index % CHARACTER_DATA.length].bg}
                characterName={CHARACTER_DATA[index % CHARACTER_DATA.length].name}
                characterMotion={CHARACTER_DATA[index % CHARACTER_DATA.length].motion}
              />
            ))}
          </div>
        )}

        {/* 더보기 버튼 — 스크롤 최하단 */}
        {challenges.length > 0 && (
          <button className="mt-[10px] mb-4 py-3 bg-gradient-to-b from-transparent to-[rgba(200,200,200,0.4)] border-none rounded-xl text-[#888] text-xs font-semibold w-full flex items-center justify-center gap-1 cursor-pointer">
            더많은 상품 보기 ↓
          </button>
        )}
      </main>
    </div>
  );
}

/* ============================================================
 * 기존 코드 (주석 처리) — v2: Q.ANDEAL 텍스트 헤더 버전
 * ============================================================
 *
 * import { getAllChallenges } from "@/lib/db/challenges";
 * import { Challenge } from "@/lib/types";
 * import CampaignTile from "@/components/CampaignTile";
 *
 * const TOKGU_IMAGES = [
 *   "/tokgu_1.png",
 *   "/tokgu_2.png",
 *   "/tokgu_3.png",
 *   "/tokgu_4.png",
 * ];
 *
 * export const dynamic = "force-dynamic";
 *
 * export default async function Home() {
 *   let challenges: Challenge[] = [];
 *   try {
 *     const allChallenges = await getAllChallenges();
 *     challenges = allChallenges.filter((c) => c.status === "published");
 *   } catch (error) {
 *     console.error("Failed to fetch challenges:", error);
 *   }
 *
 *   return (
 *     <div className="min-h-screen bg-white">
 *       <header className="border-b border-[#e0e0e0] px-5 py-3 flex items-center justify-center">
 *         <h1 className="text-[22px] font-black tracking-wide text-[#111]">
 *           Q<span className="text-[#ff6b1a]">.</span>ANDEAL
 *         </h1>
 *       </header>
 *       <div className="grid grid-cols-2 gap-2.5 px-4 py-3.5">
 *         <button className="relative flex items-center justify-center gap-1.5 py-2.5 rounded-[14px] border-[1.5px] border-[#e0e0e0] bg-white text-sm font-semibold text-[#111]">
 *           🛒 참여중인 딜
 *           {challenges.length > 0 && (
 *             <span className="absolute -top-1.5 right-[calc(50%-32px)] bg-[#ff6b1a] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
 *               {challenges.length}
 *             </span>
 *           )}
 *         </button>
 *         <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-[14px] border-[1.5px] border-[#e0e0e0] bg-white text-sm font-semibold text-[#111]">
 *           💰 페이백 현황
 *         </button>
 *       </div>
 *       <main className="px-3 pb-20">
 *         {challenges.length === 0 ? (
 *           <div className="flex flex-col items-center justify-center py-20 text-center">
 *             <div className="text-4xl mb-4">🎁</div>
 *             <p className="text-[#888]">현재 진행 중인 딜이 없습니다</p>
 *             <p className="text-sm text-[#aaa] mt-1">곧 새로운 딜이 올라올 예정이에요!</p>
 *           </div>
 *         ) : (
 *           <div className="flex flex-wrap gap-2.5">
 *             {challenges.map((challenge, index) => (
 *               <CampaignTile
 *                 key={challenge.id} id={challenge.id} platform={challenge.platform}
 *                 title={challenge.title} originalPrice={challenge.originalPrice}
 *                 paybackAmount={challenge.paybackAmount} productImage={challenge.productImage}
 *                 tokguImage={TOKGU_IMAGES[index % TOKGU_IMAGES.length]}
 *               />
 *             ))}
 *           </div>
 *         )}
 *         {challenges.length > 0 && (
 *           <button className="mt-2.5 w-full py-3 bg-gradient-to-b from-transparent to-[rgba(200,200,200,0.4)] border-none rounded-xl text-[#888] text-xs font-semibold flex items-center justify-center gap-1">
 *             더많은 상품 보기 ↓
 *           </button>
 *         )}
 *       </main>
 *       <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] grid grid-cols-5 border-t border-[#e0e0e0] bg-white safe-area-bottom">
 *         ...탭바...
 *       </nav>
 *     </div>
 *   );
 * }
 */
