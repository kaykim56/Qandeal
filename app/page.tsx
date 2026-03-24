import { getAllChallenges } from "@/lib/db/challenges";
import { Challenge } from "@/lib/types";
import CampaignTile from "@/components/CampaignTile";

const CHARACTER_DATA = [
  { image: "/char_nabi.png", bg: "#FFF0E6", name: "나비", motion: "char-bounce" },
  { image: "/char_brody.png", bg: "#E6F9F1", name: "브로디", motion: "char-float" },
  { image: "/char_jazz.png", bg: "#F0E6FF", name: "째즈", motion: "char-wobble" },
  { image: "/char_q.png", bg: "#FFF3E0", name: "큐", motion: "char-nod" },
  { image: "/char_tapi.png", bg: "#E6EEFF", name: "타피", motion: "char-sway" },
  { image: "/char_peak.png", bg: "#F0F0F0", name: "피크", motion: "char-breathe" },
];

// 개발 환경 전용 더미 데이터 (항상 4개 추가)
const DUMMY_CHALLENGES: Challenge[] = [
  {
    id: "dummy-1", platform: "쿠팡", title: "[더미] 샘플 상품 A",
    option: "", originalPrice: 15000, paybackRate: 80, paybackAmount: 12000,
    finalPrice: 3000, productImage: "", productLink: "", detailImages: [],
    missionSteps: [], status: "published", createdAt: "", updatedAt: "",
    purchaseDeadline: "", reviewDeadline: "",
  },
  {
    id: "dummy-2", platform: "스마트스토어", title: "[더미] 샘플 상품 B",
    option: "", originalPrice: 22000, paybackRate: 85, paybackAmount: 18700,
    finalPrice: 3300, productImage: "", productLink: "", detailImages: [],
    missionSteps: [], status: "published", createdAt: "", updatedAt: "",
    purchaseDeadline: "", reviewDeadline: "",
  },
  {
    id: "dummy-3", platform: "올리브영", title: "[더미] 샘플 상품 C",
    option: "", originalPrice: 19800, paybackRate: 80, paybackAmount: 15840,
    finalPrice: 3960, productImage: "", productLink: "", detailImages: [],
    missionSteps: [], status: "published", createdAt: "", updatedAt: "",
    purchaseDeadline: "", reviewDeadline: "",
  },
  {
    id: "dummy-4", platform: "카카오쇼핑", title: "[더미] 샘플 상품 D",
    option: "", originalPrice: 25000, paybackRate: 85, paybackAmount: 21250,
    finalPrice: 3750, productImage: "", productLink: "", detailImages: [],
    missionSteps: [], status: "published", createdAt: "", updatedAt: "",
    purchaseDeadline: "", reviewDeadline: "",
  },
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

  // 데모용: 항상 더미 추가 (실운영 시 DUMMY_CHALLENGES와 이 블록 삭제)
  challenges = [...challenges, ...DUMMY_CHALLENGES];

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* 헤더 — sticky 상단 고정 */}
      <header className="shrink-0 h-[80px] flex items-center justify-center border-b border-[#e0e0e0] overflow-hidden bg-white">
        <img
          src="/콴딜_로고_배경제거.png"
          alt="콴딜 로고"
          className="w-[280px] h-auto block"
        />
      </header>

      {/* 액션 버튼 — sticky 상단 고정 */}
      <div className="shrink-0 grid grid-cols-2 gap-[10px] px-4 py-[14px] bg-white">
        <button className="relative flex items-center justify-center gap-[7px] py-[11px] rounded-[14px] border-[1.5px] border-[#e0e0e0] bg-white text-[14px] font-semibold text-[#111] cursor-pointer">
          🛒 참여중인 딜
          {challenges.length > 0 && (
            <span className="absolute -top-[6px] right-[calc(50%-32px)] bg-[#ff6b1a] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
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
