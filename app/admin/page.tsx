"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, ExternalLink, LogOut, Loader2 } from "lucide-react";
import Link from "next/link";
import { Challenge } from "@/lib/types";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"draft" | "published">("published");

  // 탭에 따라 필터된 챌린지
  const filteredChallenges = challenges.filter((c) => c.status === activeTab);

  // 각 상태별 개수
  const draftCount = challenges.filter((c) => c.status === "draft").length;
  const publishedCount = challenges.filter((c) => c.status === "published").length;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchChallenges();
    }
  }, [session]);

  const fetchChallenges = async () => {
    try {
      const res = await fetch("/api/challenges");
      const data = await res.json();
      if (Array.isArray(data)) {
        setChallenges(data);
      } else {
        console.error("API error:", data);
        setChallenges([]);
      }
    } catch (error) {
      console.error("Failed to fetch challenges:", error);
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await fetch(`/api/challenges/${id}`, { method: "DELETE" });
      setChallenges(challenges.filter((c) => c.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error("Failed to delete challenge:", error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개의 챌린지를 삭제하시겠습니까?`)) return;

    setDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/challenges/${id}`, { method: "DELETE" })
        )
      );
      setChallenges(challenges.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to delete challenges:", error);
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredChallenges.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredChallenges.map((c) => c.id)));
    }
  };

  // 탭 변경 시 선택 초기화
  const handleTabChange = (tab: "draft" | "published") => {
    setActiveTab(tab);
    setSelectedIds(new Set());
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 h-14 lg:h-16 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">득템 어드민</h1>

          {/* 모바일/태블릿: 로그아웃 아이콘만 */}
          <button
            onClick={() => signOut()}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* 데스크톱: 이메일 + 로그아웃 */}
          <div className="hidden lg:flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold uppercase">
              {session.user?.email?.charAt(0) || "?"}
            </div>
            <span className="text-sm text-gray-700">{session.user?.email}</span>
            <div className="w-px h-5 bg-gray-300" />
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="max-w-[1600px] mx-auto px-4 py-4 sm:py-8">
        {/* 상단 액션 */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          {/* 탭 */}
          <div className="flex items-center gap-1 bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => handleTabChange("published")}
              className={`px-3 lg:px-4 py-1.5 lg:py-2 text-sm lg:text-base font-medium rounded-md transition-colors ${
                activeTab === "published"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              게시됨 ({publishedCount})
            </button>
            <button
              onClick={() => handleTabChange("draft")}
              className={`px-3 lg:px-4 py-1.5 lg:py-2 text-sm lg:text-base font-medium rounded-md transition-colors ${
                activeTab === "draft"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              임시저장 ({draftCount})
            </button>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deleting ? "삭제 중..." : `${selectedIds.size}개 삭제`}
              </button>
            )}
            <Link
              href="/admin/challenges/new"
              className="flex items-center gap-1.5 px-3 lg:px-4 py-1.5 lg:py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm lg:text-base"
            >
              <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="hidden sm:inline">새 챌린지</span>
              <span className="sm:hidden">추가</span>
            </Link>
          </div>
        </div>

        {/* 챌린지 리스트 */}
        {filteredChallenges.length === 0 ? (
          <div className="bg-white rounded-lg p-8 sm:p-12 text-center">
            <p className="text-gray-500 mb-4">
              {challenges.length === 0
                ? "아직 챌린지가 없습니다"
                : activeTab === "draft"
                  ? "임시저장된 챌린지가 없습니다"
                  : "게시된 챌린지가 없습니다"}
            </p>
            {challenges.length === 0 && (
              <Link
                href="/admin/challenges/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                첫 챌린지 만들기
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* 모바일/태블릿: 리스트 레이아웃 */}
            <div className="lg:hidden space-y-2">
              {/* 전체 선택 */}
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredChallenges.length && filteredChallenges.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-orange-500 rounded"
                  />
                  <span className="text-sm text-gray-600">전체 선택</span>
                </label>
                <span className="text-xs text-gray-400">{filteredChallenges.length}개</span>
              </div>

              {filteredChallenges.map((challenge) => (
                <Link
                  key={challenge.id}
                  href={`/admin/challenges/${challenge.id}`}
                  className={`block bg-white rounded-lg shadow-sm p-3 active:bg-gray-50 ${
                    selectedIds.has(challenge.id) ? "ring-2 ring-orange-500" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(challenge.id)}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleSelect(challenge.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-orange-500 rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-medium text-orange-600">
                          {challenge.platform}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className={`text-xs ${
                          challenge.status === "published" ? "text-green-600" : "text-gray-400"
                        }`}>
                          {challenge.status === "published" ? "게시됨" : "임시저장"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 truncate">{challenge.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        페이백 <span className="text-orange-500 font-medium">{challenge.paybackRate}%</span>
                        <span className="text-gray-300 mx-1">·</span>
                        {challenge.paybackAmount.toLocaleString()}원
                      </p>
                    </div>
                    <Edit className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>

            {/* 데스크톱: 테이블 레이아웃 */}
            <div className="hidden lg:block bg-white rounded-lg shadow">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredChallenges.length && filteredChallenges.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-orange-500 rounded cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap">
                      플랫폼
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap">
                      제목
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap">
                      페이백
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap">
                      상태
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap">
                      작성자
                    </th>
                    <th className="px-3 py-3 text-right text-sm font-medium text-gray-500 whitespace-nowrap">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredChallenges.map((challenge) => (
                    <tr
                      key={challenge.id}
                      className={`hover:bg-gray-50 ${selectedIds.has(challenge.id) ? "bg-orange-50" : ""}`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(challenge.id)}
                          onChange={() => toggleSelect(challenge.id)}
                          className="w-4 h-4 text-orange-500 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-orange-100 text-orange-700">
                          {challenge.platform}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm min-w-[200px]">
                        <Link
                          href={`/admin/challenges/${challenge.id}`}
                          className="text-gray-900 hover:text-orange-500 line-clamp-1"
                        >
                          {challenge.title}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-sm whitespace-nowrap">
                        <span className="text-orange-500 font-medium">
                          {challenge.paybackRate}%
                        </span>
                        <span className="text-gray-400 ml-1">
                          ({challenge.paybackAmount.toLocaleString()}원)
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                            challenge.status === "published"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {challenge.status === "published" ? "게시됨" : "임시저장"}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {challenge.createdBy ? (
                          <div className="flex items-center gap-2" title={challenge.createdBy}>
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                              {challenge.createdBy.charAt(0)}
                            </div>
                            <span className="text-sm text-gray-600 max-w-[100px] truncate">
                              {challenge.createdBy.split("@")[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/challenge/${challenge.id}`}
                            target="_blank"
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="미리보기"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/admin/challenges/${challenge.id}`}
                            className="p-2 text-gray-400 hover:text-blue-600"
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(challenge.id)}
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
