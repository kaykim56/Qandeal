"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { Challenge } from "@/lib/types";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

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
      setChallenges(data);
    } catch (error) {
      console.error("Failed to fetch challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await fetch(`/api/challenges/${id}`, { method: "DELETE" });
      setChallenges(challenges.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Failed to delete challenge:", error);
    }
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
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">QANDA 챌린지 어드민</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{session.user?.email}</span>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 상단 액션 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            챌린지 목록 ({challenges.length})
          </h2>
          <Link
            href="/admin/challenges/new"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 챌린지
          </Link>
        </div>

        {/* 챌린지 리스트 */}
        {challenges.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p className="text-gray-500 mb-4">아직 챌린지가 없습니다</p>
            <Link
              href="/admin/challenges/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              첫 챌린지 만들기
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    플랫폼
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    제목
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    페이백
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    상태
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {challenges.map((challenge) => (
                  <tr key={challenge.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-orange-100 text-orange-700">
                        {challenge.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {challenge.title}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-orange-500 font-medium">
                        {challenge.paybackRate}%
                      </span>
                      <span className="text-gray-400 ml-1">
                        ({challenge.paybackAmount.toLocaleString()}원)
                      </span>
                    </td>
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
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
        )}
      </main>
    </div>
  );
}
