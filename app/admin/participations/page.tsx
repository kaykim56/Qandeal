"use client";

import { useState, useEffect } from "react";
import { Check, X, Eye, Loader2, ChevronLeft, ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Participation {
  id: string;
  challengeId: string;
  userId: string;
  purchaseImageUrl: string;
  reviewImageUrl: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  testerEmail?: string;
  challenge?: {
    title: string;
    platform: string;
    productImage: string;
  } | null;
}

export default function VerificationsPage() {
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchParticipations();
  }, []);

  const fetchParticipations = async () => {
    try {
      const res = await fetch("/api/admin/participations");
      const data = await res.json();
      // API가 배열을 반환하는지 확인
      if (Array.isArray(data)) {
        setParticipations(data);
      } else {
        console.error("Invalid data format:", data);
        setParticipations([]);
      }
    } catch (error) {
      console.error("Failed to fetch participations:", error);
      setParticipations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: "approved" | "rejected") => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/participations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setParticipations((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status } : p))
        );
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(null);
    }
  };

  const filtered = participations.filter((p) =>
    filter === "all" ? true : p.status === filter
  );

  // 검토 가능한 항목 (구매+리뷰 둘 다 있는 경우)
  const reviewable = filtered.filter(
    (p) => p.purchaseImageUrl && p.reviewImageUrl
  );
  // 인증 미완료 항목
  const incomplete = filtered.filter(
    (p) => !p.purchaseImageUrl || !p.reviewImageUrl
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">대기중</span>;
      case "approved":
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">승인</span>;
      case "rejected":
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">거절</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">인증 검토</h1>
        </div>
      </header>

      {/* 필터 */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-orange-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {f === "pending" && "대기중"}
              {f === "approved" && "승인"}
              {f === "rejected" && "거절"}
              {f === "all" && "전체"}
              <span className="ml-1 text-xs">
                ({participations.filter((p) => f === "all" || p.status === f).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            검토할 인증이 없습니다
          </div>
        ) : (
          <div className="space-y-6">
            {/* 검토 가능한 항목 */}
            {reviewable.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-3">
                  검토 가능 ({reviewable.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {reviewable.map((p) => (
                    <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {/* 이미지 2개 나란히 */}
                      <div className="grid grid-cols-2 gap-px bg-gray-100">
                        <div
                          className="aspect-square bg-gray-50 cursor-pointer relative group"
                          onClick={() => setSelectedImage(p.purchaseImageUrl)}
                        >
                          <Image
                            src={p.purchaseImageUrl}
                            alt="구매 인증"
                            width={200}
                            height={200}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                            구매 인증
                          </span>
                        </div>
                        <div
                          className="aspect-square bg-gray-50 cursor-pointer relative group"
                          onClick={() => setSelectedImage(p.reviewImageUrl)}
                        >
                          <Image
                            src={p.reviewImageUrl}
                            alt="리뷰 인증"
                            width={200}
                            height={200}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                            리뷰 인증
                          </span>
                        </div>
                      </div>

                      {/* 정보 */}
                      <div className="p-4">
                        {/* 챌린지 정보 */}
                        {p.challenge && (
                          <div className="mb-3 pb-3 border-b border-gray-100">
                            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-600 mb-1">
                              {p.challenge.platform}
                            </span>
                            <p className="text-sm font-medium text-gray-900 line-clamp-1">
                              {p.challenge.title}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {p.testerEmail ? p.testerEmail.split("@")[0] : `${p.userId.slice(0, 12)}...`}
                            </span>
                            {p.testerEmail && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-100 text-purple-700 font-medium">
                                테스트
                              </span>
                            )}
                          </div>
                          {getStatusBadge(p.status)}
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                          {formatDate(p.createdAt)}
                        </p>

                        {/* 액션 버튼 */}
                        <div className="flex gap-2">
                          {p.status !== "approved" && (
                            <button
                              onClick={() => handleUpdateStatus(p.id, "approved")}
                              disabled={updating === p.id}
                              className="flex-1 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {updating === p.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  승인
                                </>
                              )}
                            </button>
                          )}
                          {p.status !== "rejected" && (
                            <button
                              onClick={() => handleUpdateStatus(p.id, "rejected")}
                              disabled={updating === p.id}
                              className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {updating === p.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <X className="w-4 h-4" />
                                  거절
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 인증 미완료 항목 */}
            {incomplete.length > 0 && filter === "pending" && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-3">
                  인증 미완료 ({incomplete.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {incomplete.map((p) => (
                    <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      {/* 챌린지 정보 */}
                      {p.challenge && (
                        <div className="mb-3 pb-2 border-b border-gray-100">
                          <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-orange-100 text-orange-600 mb-1">
                            {p.challenge.platform}
                          </span>
                          <p className="text-xs font-medium text-gray-900 line-clamp-1">
                            {p.challenge.title}
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2 mb-3">
                        {/* 구매 인증 상태 */}
                        <div className={`flex-1 aspect-square rounded-lg flex items-center justify-center ${
                          p.purchaseImageUrl ? "bg-green-50" : "bg-gray-100"
                        }`}>
                          {p.purchaseImageUrl ? (
                            <Image
                              src={p.purchaseImageUrl}
                              alt="구매"
                              width={80}
                              height={80}
                              className="w-full h-full object-cover rounded-lg cursor-pointer"
                              onClick={() => setSelectedImage(p.purchaseImageUrl)}
                              loading="lazy"
                            />
                          ) : (
                            <div className="text-center">
                              <ImageIcon className="w-6 h-6 text-gray-300 mx-auto" />
                              <span className="text-xs text-gray-400">구매</span>
                            </div>
                          )}
                        </div>
                        {/* 리뷰 인증 상태 */}
                        <div className={`flex-1 aspect-square rounded-lg flex items-center justify-center ${
                          p.reviewImageUrl ? "bg-green-50" : "bg-gray-100"
                        }`}>
                          {p.reviewImageUrl ? (
                            <Image
                              src={p.reviewImageUrl}
                              alt="리뷰"
                              width={80}
                              height={80}
                              className="w-full h-full object-cover rounded-lg cursor-pointer"
                              onClick={() => setSelectedImage(p.reviewImageUrl)}
                              loading="lazy"
                            />
                          ) : (
                            <div className="text-center">
                              <ImageIcon className="w-6 h-6 text-gray-300 mx-auto" />
                              <span className="text-xs text-gray-400">리뷰</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-gray-500 truncate">
                          {p.testerEmail ? p.testerEmail.split("@")[0] : `${p.userId.slice(0, 12)}...`}
                        </p>
                        {p.testerEmail && (
                          <span className="px-1 py-0.5 text-[9px] rounded bg-purple-100 text-purple-700 font-medium">
                            테스트
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {formatDate(p.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 이미지 확대 모달 */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={selectedImage}
            alt="확대 이미지"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
