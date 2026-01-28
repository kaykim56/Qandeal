"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, ExternalLink, LogOut, Loader2, RefreshCw, ClipboardCheck, X, ChevronDown, ChevronUp, Database, Copy, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Challenge } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const supabase = createBrowserSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"draft" | "published">("published");
  const [checkingPrices, setCheckingPrices] = useState(false);
  const [priceCheckResult, setPriceCheckResult] = useState<{
    checked: number;
    changed: number;
    changes: Array<{ title: string; oldPrice: number; newPrice: number }>;
  } | null>(null);

  // 데이터 정리 관련 상태
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupDiagnosis, setCleanupDiagnosis] = useState<{
    challenges: { deleted: number; draft: number; total: number };
    participations: { duplicates: number; total: number };
  } | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleaningAction, setCleaningAction] = useState<string | null>(null);

  // 탭에 따라 필터된 챌린지
  const filteredChallenges = challenges.filter((c) => c.status === activeTab);

  // 각 상태별 개수
  const draftCount = challenges.filter((c) => c.status === "draft").length;
  const publishedCount = challenges.filter((c) => c.status === "published").length;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/admin/login");
        return;
      }

      // 관리자 권한 체크
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("id")
        .eq("email", session.user.email || "")
        .single();

      if (!adminUser) {
        await supabase.auth.signOut();
        router.push("/admin/login");
        return;
      }

      setUser(session.user);
      fetchChallenges();
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // 챌린지 복제
  const handleClone = async (id: string) => {
    if (!confirm("이 챌린지를 복제하시겠습니까?")) return;

    try {
      const res = await fetch("/api/admin/challenges/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: id }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`복제 완료! 새 ID: ${data.newId}`);
        fetchChallenges(); // 목록 새로고침
      } else {
        alert("복제 실패: " + (data.error || "알 수 없는 오류"));
      }
    } catch (error) {
      console.error("Clone failed:", error);
      alert("복제에 실패했습니다");
    }
  };

  // 게시 상태 토글 (published <-> draft)
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    const message = newStatus === "draft" ? "게시를 내리시겠습니까?" : "게시하시겠습니까?";

    if (!confirm(message)) return;

    try {
      const res = await fetch(`/api/challenges/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setChallenges(challenges.map((c) =>
          c.id === id ? { ...c, status: newStatus as "draft" | "published" } : c
        ));
        alert(newStatus === "draft" ? "게시가 내려졌습니다" : "게시되었습니다");
      } else {
        alert("상태 변경에 실패했습니다");
      }
    } catch (error) {
      console.error("Toggle status failed:", error);
      alert("상태 변경에 실패했습니다");
    }
  };

  // 가격 체크 실행
  const handlePriceCheck = async () => {
    setCheckingPrices(true);
    setPriceCheckResult(null);

    try {
      const res = await fetch("/api/cron/check-prices");
      const data = await res.json();

      if (data.success) {
        setPriceCheckResult({
          checked: data.checked,
          changed: data.changed,
          changes: data.priceChanges.map((c: { title: string; oldPrice: number; newPrice: number }) => ({
            title: c.title,
            oldPrice: c.oldPrice,
            newPrice: c.newPrice,
          })),
        });

        // 가격 변동이 있으면 목록 새로고침
        if (data.changed > 0) {
          fetchChallenges();
        }
      }
    } catch (error) {
      console.error("Price check failed:", error);
      alert("가격 체크 실패");
    } finally {
      setCheckingPrices(false);
    }
  };

  // 데이터 진단 가져오기
  const fetchCleanupDiagnosis = async () => {
    setCleanupLoading(true);
    try {
      const res = await fetch("/api/admin/cleanup");
      const data = await res.json();
      if (data.success) {
        setCleanupDiagnosis({
          challenges: {
            deleted: data.diagnosis.challenges.deleted,
            draft: data.diagnosis.challenges.draft,
            total: data.diagnosis.challenges.total,
          },
          participations: {
            duplicates: data.diagnosis.participations.duplicates.length,
            total: data.diagnosis.participations.total,
          },
        });
      }
    } catch (error) {
      console.error("Cleanup diagnosis failed:", error);
    } finally {
      setCleanupLoading(false);
    }
  };

  // 정리 실행
  const runCleanup = async (action: string) => {
    if (!confirm("정말 정리하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;

    setCleaningAction(action);
    try {
      const res = await fetch("/api/admin/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchCleanupDiagnosis();
        fetchChallenges();
      } else {
        alert("정리 실패: " + (data.error || "알 수 없는 오류"));
      }
    } catch (error) {
      console.error("Cleanup failed:", error);
      alert("정리 실패");
    } finally {
      setCleaningAction(null);
    }
  };

  // 정리 패널 열 때 진단 데이터 가져오기
  useEffect(() => {
    if (cleanupOpen && !cleanupDiagnosis) {
      fetchCleanupDiagnosis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanupOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 overflow-x-hidden">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="px-4 sm:px-6 h-14 lg:h-16 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 whitespace-nowrap">득템 어드민</h1>

          {/* 모바일: 로그아웃 아이콘만 */}
          <button
            onClick={handleSignOut}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* 태블릿+: 이메일 + 로그아웃 */}
          <div className="hidden md:flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold uppercase">
              {user?.email?.charAt(0) || "?"}
            </div>
            <span className="text-sm text-gray-700">{user?.email}</span>
            <div className="w-px h-5 bg-gray-300" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="px-4 sm:px-6 py-4 sm:py-6">
        {/* 상단 액션 */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4 sm:mb-6">
          {/* 탭 */}
          <div className="flex items-center gap-1 bg-gray-200 rounded-lg p-1 self-start">
            <button
              onClick={() => handleTabChange("published")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "published"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              게시됨 ({publishedCount})
            </button>
            <button
              onClick={() => handleTabChange("draft")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "draft"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              임시저장 ({draftCount})
            </button>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
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
              href="/admin/participations"
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ClipboardCheck className="w-4 h-4" />
              인증 검토
            </Link>
            <button
              onClick={handlePriceCheck}
              disabled={checkingPrices}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {checkingPrices ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {checkingPrices ? "체크 중..." : "가격 체크"}
            </button>
            <Link
              href="/admin/challenges/new"
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              새 챌린지
            </Link>
          </div>
        </div>

        {/* 가격 체크 결과 */}
        {priceCheckResult && (
          <div className={`mb-4 p-4 rounded-lg ${priceCheckResult.changed > 0 ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${priceCheckResult.changed > 0 ? "text-orange-800" : "text-green-800"}`}>
                  {priceCheckResult.changed > 0
                    ? `${priceCheckResult.changed}개 상품 가격 변동!`
                    : "가격 변동 없음"}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {priceCheckResult.checked}개 상품 체크 완료
                </p>
                {priceCheckResult.changes.length > 0 && (
                  <ul className="mt-2 text-sm text-orange-700">
                    {priceCheckResult.changes.map((c, i) => (
                      <li key={i}>
                        • {c.title}: {c.oldPrice.toLocaleString()}원 → {c.newPrice.toLocaleString()}원
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={() => setPriceCheckResult(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* 챌린지 리스트 */}
        {filteredChallenges.length === 0 ? (
          <div className="bg-white p-8 sm:p-12 text-center">
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
            {/* 모바일: 리스트 레이아웃 */}
            <div className="md:hidden bg-white">
              {/* 전체 선택 */}
              <div className="flex items-center justify-between bg-white px-3 py-2 border-b border-gray-200">
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
                  className={`block bg-white p-3 border-b border-gray-100 active:bg-gray-50 ${
                    selectedIds.has(challenge.id) ? "bg-orange-50" : ""
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

            {/* 테이블 레이아웃 (태블릿+) */}
            <div className="hidden md:block bg-white overflow-x-auto">
              <table className="w-full min-w-[800px]">
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
                            onClick={() => handleClone(challenge.id)}
                            className="p-2 text-gray-400 hover:text-purple-600"
                            title="복제"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(challenge.id, challenge.status)}
                            className={`p-2 text-gray-400 ${challenge.status === "published" ? "hover:text-orange-600" : "hover:text-green-600"}`}
                            title={challenge.status === "published" ? "게시 내리기" : "게시하기"}
                          >
                            {challenge.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
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

        {/* 데이터 정리 섹션 */}
        <div className="mt-6 bg-white border-t border-gray-200">
          <button
            onClick={() => setCleanupOpen(!cleanupOpen)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700">데이터 정리</span>
              {cleanupDiagnosis && (cleanupDiagnosis.challenges.deleted > 0 || cleanupDiagnosis.participations.duplicates > 0) && (
                <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                  정리 필요
                </span>
              )}
            </div>
            {cleanupOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {cleanupOpen && (
            <div className="px-4 pb-4 border-t border-gray-100">
              {cleanupLoading ? (
                <div className="py-6 text-center text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  진단 중...
                </div>
              ) : cleanupDiagnosis ? (
                <div className="pt-4 space-y-4">
                  {/* 가이드 */}
                  <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                    <p className="font-medium mb-2">어드민 & Google Sheets 관계</p>
                    <ul className="space-y-1 text-blue-700 mb-3">
                      <li>• 어드민은 <strong>UI</strong>이고, Google Sheets가 <strong>데이터베이스</strong> 역할을 합니다.</li>
                      <li>• 어드민에서 생성/수정/삭제하면 시트에 자동 반영됩니다.</li>
                      <li>• 시트를 직접 수정해도 어드민에 반영되지만, 구조가 깨질 수 있으니 주의하세요.</li>
                    </ul>
                    <p className="font-medium mb-2">데이터 정리</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>• <strong>삭제된 챌린지</strong>: 어드민에서 삭제한 챌린지는 시트에서 &quot;deleted&quot; 상태로 남아있습니다. 정리하면 시트에서 완전히 제거됩니다.</li>
                      <li>• <strong>중복 참여</strong>: 같은 유저가 같은 챌린지에 여러 번 참여 기록이 생긴 경우입니다. 정리하면 승인된 것 또는 가장 최신 기록만 남기고 나머지를 삭제합니다.</li>
                    </ul>
                    <a
                      href="https://docs.google.com/spreadsheets/d/1O6yvB4qwNVARANz6JRBlThT0X5VY9UKpR4BblIo8_dk/edit?gid=0#gid=0"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Google Sheets 바로가기
                    </a>
                  </div>

                  {/* 진단 결과 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">삭제된 챌린지</p>
                      <p className="text-xl font-bold text-gray-900">{cleanupDiagnosis.challenges.deleted}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">중복 참여</p>
                      <p className="text-xl font-bold text-gray-900">{cleanupDiagnosis.participations.duplicates}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">전체 챌린지</p>
                      <p className="text-xl font-bold text-gray-900">{cleanupDiagnosis.challenges.total}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">전체 참여</p>
                      <p className="text-xl font-bold text-gray-900">{cleanupDiagnosis.participations.total}</p>
                    </div>
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => runCleanup("remove-deleted-challenges")}
                      disabled={cleanupDiagnosis.challenges.deleted === 0 || cleaningAction !== null}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cleaningAction === "remove-deleted-challenges" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      삭제된 챌린지 정리
                    </button>
                    <button
                      onClick={() => runCleanup("remove-duplicate-participations")}
                      disabled={cleanupDiagnosis.participations.duplicates === 0 || cleaningAction !== null}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cleaningAction === "remove-duplicate-participations" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      중복 참여 정리
                    </button>
                    <button
                      onClick={fetchCleanupDiagnosis}
                      disabled={cleanupLoading}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${cleanupLoading ? "animate-spin" : ""}`} />
                      새로고침
                    </button>
                  </div>

                  <p className="text-xs text-gray-400">
                    * 정리된 데이터는 복구할 수 없습니다.
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center text-gray-500">
                  진단 데이터를 불러올 수 없습니다
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
