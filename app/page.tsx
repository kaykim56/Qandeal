import Link from "next/link";
import { getAllChallenges } from "@/lib/google-sheets";
import { Challenge } from "@/lib/types";

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
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 h-14 flex items-center justify-center">
          <h1 className="text-xl font-bold text-gray-900">득템</h1>
        </div>
      </header>

      {/* 메인 */}
      <main className="px-4 py-4">
        {challenges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-4">🎁</div>
            <p className="text-gray-500">현재 진행 중인 득템이 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">곧 새로운 득템이 올라올 예정이에요!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {challenges.map((challenge) => {
              // 저장된 페이백 금액 사용, 실구매가 계산
              const finalPrice = challenge.originalPrice - challenge.paybackAmount;

              return (
              <Link
                key={challenge.id}
                href={`/challenge/${challenge.id}`}
                className="flex bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* 상품 이미지 */}
                <div className="w-28 flex-shrink-0 bg-gray-100 relative">
                  {challenge.productImage ? (
                    <img
                      src={challenge.productImage}
                      alt={challenge.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                      <span className="text-2xl">🎁</span>
                    </div>
                  )}
                  {/* 페이백 뱃지 */}
                  <div className="absolute top-1.5 left-1.5">
                    <span className="inline-block px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded">
                      {challenge.paybackRate}%
                    </span>
                  </div>
                </div>

                {/* 상품 정보 */}
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  <div>
                    {/* 플랫폼 */}
                    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded mb-1 ${
                      challenge.platform.includes("카카오")
                        ? "bg-yellow-400 text-yellow-900"
                        : challenge.platform.includes("쿠팡")
                        ? "bg-blue-500 text-white"
                        : challenge.platform.includes("올리브영")
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {challenge.platform}
                    </span>

                    {/* 제목 */}
                    <h2 className="text-sm font-semibold text-gray-900 line-clamp-2">
                      {challenge.title}
                    </h2>
                  </div>

                  {/* 가격 정보 */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base font-bold text-gray-900">
                      {finalPrice.toLocaleString()}원
                    </span>
                    <span className="text-xs text-gray-400 line-through">
                      {challenge.originalPrice.toLocaleString()}원
                    </span>
                    <span className="text-xs font-medium text-orange-500">
                      {challenge.paybackAmount.toLocaleString()}원 페이백
                    </span>
                  </div>
                </div>
              </Link>
            );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
