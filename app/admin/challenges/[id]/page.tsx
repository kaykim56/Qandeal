"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, X, ExternalLink, Loader2, LinkIcon, ImageIcon } from "lucide-react";
import Link from "next/link";
import { ChallengeWithMissions } from "@/lib/types";

export default function EditChallengePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingImage, setFetchingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [form, setForm] = useState({
    platform: "",
    title: "",
    hasSpecificOption: false,
    option: "",
    purchaseTimeLimit: "",
    originalPrice: 0,
    paybackRate: 0,
    paybackAmount: 0,
    finalPrice: 0,
    productImage: "",
    productLink: "",
    detailImage: "",
    status: "draft" as "draft" | "published" | "deleted",
    purchaseExampleImage: "",
    reviewExampleImage: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session && id) {
      fetchChallenge();
    }
  }, [session, id]);

  const fetchChallenge = async () => {
    try {
      const res = await fetch(`/api/challenges/${id}`);
      if (!res.ok) {
        router.push("/admin");
        return;
      }
      const data: ChallengeWithMissions = await res.json();
      setForm({
        platform: data.platform,
        title: data.title,
        hasSpecificOption: !!data.option,
        option: data.option,
        purchaseTimeLimit: data.purchaseTimeLimit,
        originalPrice: data.originalPrice,
        paybackRate: data.paybackRate,
        paybackAmount: data.paybackAmount,
        finalPrice: data.finalPrice,
        productImage: data.productImage,
        productLink: data.productLink,
        detailImage: data.detailImage || "",
        status: data.status,
        purchaseExampleImage: data.missions[0]?.exampleImage || "",
        reviewExampleImage: data.missions[1]?.exampleImage || "",
      });
    } catch (error) {
      console.error("Failed to fetch challenge:", error);
      router.push("/admin");
    } finally {
      setLoading(false);
    }
  };

  // 페이백 금액 자동 계산
  useEffect(() => {
    const paybackAmount = Math.round(form.originalPrice * (form.paybackRate / 100));
    const finalPrice = form.originalPrice - paybackAmount;
    setForm((prev) => ({ ...prev, paybackAmount, finalPrice }));
  }, [form.originalPrice, form.paybackRate]);

  // 제품 링크에서 이미지 자동 가져오기
  const fetchImageFromUrl = async () => {
    if (!form.productLink) {
      setImageError("제품 링크를 먼저 입력해주세요");
      return;
    }

    setFetchingImage(true);
    setImageError(null);

    try {
      const res = await fetch("/api/fetch-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.productLink }),
      });
      const data = await res.json();

      if (data.imageUrl) {
        setForm((prev) => ({ ...prev, productImage: data.imageUrl }));
      } else {
        setImageError(data.error || "이미지를 찾을 수 없습니다. 직접 URL을 입력해주세요.");
      }
    } catch (error) {
      console.error("Fetch image failed:", error);
      setImageError("이미지 가져오기 실패. 직접 URL을 입력해주세요.");
    } finally {
      setFetchingImage(false);
    }
  };

  // 필수 필드 검증
  const validateForm = (): string | null => {
    if (!form.platform.trim()) return "플랫폼을 입력해주세요";
    if (!form.title.trim()) return "제목을 입력해주세요";
    if (!form.purchaseTimeLimit) return "구매 기한을 입력해주세요";
    if (!form.originalPrice || form.originalPrice <= 0) return "구매가를 입력해주세요";
    if (!form.paybackRate || form.paybackRate <= 0) return "페이백 비율을 입력해주세요";
    if (!form.productLink.trim()) return "제품 링크를 입력해주세요";
    if (form.hasSpecificOption && !form.option.trim()) return "옵션을 입력하거나 옵션 지정을 해제해주세요";
    return null;
  };

  const handleSave = async (status: "draft" | "published", openPreview = false) => {
    // 게시할 때만 필수 필드 검증
    if (status === "published") {
      const error = validateForm();
      if (error) {
        alert(error);
        return;
      }
    }

    setSaving(true);

    try {
      // hasSpecificOption이 false면 option을 빈 문자열로
      const dataToSave = {
        ...form,
        option: form.hasSpecificOption ? form.option : "",
        status,
      };

      const res = await fetch(`/api/challenges/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });

      if (res.ok) {
        setForm((prev) => ({ ...prev, status }));
        if (openPreview) {
          window.open(`/challenge/${id}`, "_blank");
        }
        alert(status === "published" ? "게시되었습니다" : "저장되었습니다");
      } else {
        alert("저장에 실패했습니다");
      }
    } catch (error) {
      console.error("Save failed:", error);
      alert("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const challengeUrl = typeof window !== "undefined"
    ? `${window.location.origin}/challenge/${id}`
    : `/challenge/${id}`;

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">챌린지 수정</h1>
          </div>
          <Link
            href={`/challenge/${id}`}
            target="_blank"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ExternalLink className="w-4 h-4" />
            미리보기
          </Link>
        </div>
      </header>

      {/* 폼 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <form className="space-y-6">
          {/* 기본 정보 */}
          <section className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  플랫폼 *
                </label>
                <input
                  type="text"
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  placeholder="예: 카카오 선물하기, 올리브영"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  구매 기한 *
                </label>
                <input
                  type="date"
                  value={form.purchaseTimeLimit}
                  onChange={(e) => setForm({ ...form, purchaseTimeLimit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목 *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="예: 수플린 달콤한 설향 딸기 800g 구매하기"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">특정 옵션만 페이백 대상</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, hasSpecificOption: !form.hasSpecificOption })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.hasSpecificOption ? "bg-orange-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.hasSpecificOption ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                {form.hasSpecificOption ? (
                  <textarea
                    value={form.option}
                    onChange={(e) => setForm({ ...form, option: e.target.value })}
                    placeholder="페이백 대상 옵션을 입력하세요&#10;예: 특품(24~30입) *1개"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-500">모든 옵션이 페이백 대상입니다</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제품 링크 *
                </label>
                <input
                  type="url"
                  value={form.productLink}
                  onChange={(e) => setForm({ ...form, productLink: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </section>

          {/* 가격 정보 */}
          <section className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">가격 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  구매가 (원) *
                </label>
                <input
                  type="number"
                  value={form.originalPrice || ""}
                  onChange={(e) => setForm({ ...form, originalPrice: Number(e.target.value) })}
                  placeholder="30000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  페이백 (%) *
                </label>
                <input
                  type="number"
                  value={form.paybackRate || ""}
                  onChange={(e) => setForm({ ...form, paybackRate: Number(e.target.value) })}
                  placeholder="40"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  실구매가 (자동계산)
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg font-medium">
                  {form.finalPrice.toLocaleString()}원
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  페이백 금액 (자동계산)
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg text-orange-500 font-medium">
                  {form.paybackAmount.toLocaleString()}원
                </div>
              </div>
            </div>
          </section>

          {/* 이미지 */}
          <section className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">제품 이미지</h2>

            {/* 이미지 미리보기 */}
            {form.productImage && (
              <div className="mb-4 relative inline-block">
                <div className="w-48 h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={form.productImage}
                    alt="제품 이미지"
                    className="w-full h-full object-cover"
                    onError={() => setImageError("이미지를 불러올 수 없습니다")}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, productImage: "" })}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 이미지 가져오기 버튼 */}
            {!form.productImage && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={fetchImageFromUrl}
                  disabled={fetchingImage || !form.productLink}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fetchingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      이미지 가져오는 중...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      제품 링크에서 이미지 가져오기
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500">
                  제품 링크를 먼저 입력한 후 버튼을 클릭하세요
                </p>
              </div>
            )}

            {/* 에러 메시지 */}
            {imageError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{imageError}</p>
              </div>
            )}

            {/* 직접 URL 입력 */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <ImageIcon className="w-4 h-4" />
                직접 이미지 URL 입력
              </label>
              <input
                type="url"
                value={form.productImage}
                onChange={(e) => {
                  setForm({ ...form, productImage: e.target.value });
                  setImageError(null);
                }}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                자동으로 가져오기가 안 될 경우 이미지 URL을 직접 입력해주세요
              </p>
            </div>
          </section>

          {/* 챌린지 URL (게시된 경우) */}
          {form.status === "published" && (
            <section className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-800 mb-1">게시된 챌린지 URL</p>
                  <p className="text-sm text-green-700 truncate">{challengeUrl}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(challengeUrl);
                    alert("URL이 복사되었습니다!");
                  }}
                  className="flex-shrink-0 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  복사
                </button>
              </div>
            </section>
          )}

          {/* 저장 버튼 */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
            >
              임시저장
            </button>
            <button
              type="button"
              onClick={() => handleSave(form.status === "deleted" ? "draft" : form.status, true)}
              disabled={saving}
              className="px-3 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
            >
              저장 후 미리보기
            </button>
            <button
              type="button"
              onClick={() => handleSave("published")}
              disabled={saving}
              className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
            >
              저장 후 게시
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
