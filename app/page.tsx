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
          <div className="space-y-4">
            {challenges.map((challenge) => (
              <Link
                key={challenge.id}
                href={`/challenge/${challenge.id}`}
                className="block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* 상품 이미지 */}
                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  {challenge.productImage ? (
                    <img
                      src={challenge.productImage}
                      alt={challenge.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <span className="text-5xl">🎁</span>
                    </div>
                  )}
                  {/* 페이백 뱃지 */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-block px-2.5 py-1 bg-orange-500 text-white text-sm font-bold rounded-lg">
                      {challenge.paybackRate}% 페이백
                    </span>
                  </div>
                </div>

                {/* 상품 정보 */}
                <div className="p-4">
                  {/* 플랫폼 */}
                  <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded mb-2">
                    {challenge.platform}
                  </span>

                  {/* 제목 */}
                  <h2 className="text-base font-semibold text-gray-900 line-clamp-2 mb-2">
                    {challenge.title}
                  </h2>

                  {/* 가격 정보 */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {challenge.finalPrice.toLocaleString()}원
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      {challenge.originalPrice.toLocaleString()}원
                    </span>
                    <span className="text-sm font-medium text-orange-500">
                      {challenge.paybackAmount.toLocaleString()}원 돌려받기
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
