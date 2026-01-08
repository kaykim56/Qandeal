"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, Upload, X } from "lucide-react";
import Link from "next/link";

export default function NewChallengePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const [form, setForm] = useState({
    platform: "",
    title: "",
    option: "",
    purchaseTimeLimit: "",
    originalPrice: 0,
    paybackRate: 0,
    paybackAmount: 0,
    finalPrice: 0,
    productImage: "",
    productLink: "",
    status: "draft" as "draft" | "published",
    purchaseExampleImage: "",
    reviewExampleImage: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

  // 페이백 금액 자동 계산
  useEffect(() => {
    const paybackAmount = Math.round(form.originalPrice * (form.paybackRate / 100));
    const finalPrice = form.originalPrice - paybackAmount;
    setForm((prev) => ({ ...prev, paybackAmount, finalPrice }));
  }, [form.originalPrice, form.paybackRate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(field);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setForm((prev) => ({ ...prev, [field]: data.url }));
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("이미지 업로드에 실패했습니다");
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/admin/challenges/${data.id}`);
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

  if (status === "loading") {
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">새 챌린지 만들기</h1>
        </div>
      </header>

      {/* 폼 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
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
                  type="text"
                  value={form.purchaseTimeLimit}
                  onChange={(e) => setForm({ ...form, purchaseTimeLimit: e.target.value })}
                  placeholder="예: 1/8 하루 동안"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  옵션 정보 *
                </label>
                <input
                  type="text"
                  value={form.option}
                  onChange={(e) => setForm({ ...form, option: e.target.value })}
                  placeholder="예: 특품(24~30입) *1개"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
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
                  페이백 금액 (자동계산)
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg text-orange-500 font-medium">
                  {form.paybackAmount.toLocaleString()}원
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  실구매가 (자동계산)
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg font-medium">
                  {form.finalPrice.toLocaleString()}원
                </div>
              </div>
            </div>
          </section>

          {/* 이미지 */}
          <section className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">이미지</h2>
            <div className="grid grid-cols-3 gap-4">
              {/* 제품 이미지 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제품 이미지
                </label>
                <ImageUploader
                  value={form.productImage}
                  onChange={(url) => setForm({ ...form, productImage: url })}
                  onUpload={(e) => handleImageUpload(e, "productImage")}
                  uploading={uploading === "productImage"}
                />
              </div>
              {/* 구매 인증 예시 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  구매 인증 예시
                </label>
                <ImageUploader
                  value={form.purchaseExampleImage}
                  onChange={(url) => setForm({ ...form, purchaseExampleImage: url })}
                  onUpload={(e) => handleImageUpload(e, "purchaseExampleImage")}
                  uploading={uploading === "purchaseExampleImage"}
                />
              </div>
              {/* 리뷰 인증 예시 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  리뷰 인증 예시
                </label>
                <ImageUploader
                  value={form.reviewExampleImage}
                  onChange={(url) => setForm({ ...form, reviewExampleImage: url })}
                  onUpload={(e) => handleImageUpload(e, "reviewExampleImage")}
                  uploading={uploading === "reviewExampleImage"}
                />
              </div>
            </div>
          </section>

          {/* 저장 버튼 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.status === "published"}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.checked ? "published" : "draft" })
                  }
                  className="w-4 h-4 text-orange-500 rounded"
                />
                <span className="text-sm text-gray-700">바로 게시</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

// 이미지 업로더 컴포넌트
function ImageUploader({
  value,
  onChange,
  onUpload,
  uploading,
}: {
  value: string;
  onChange: (url: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}) {
  return (
    <div className="relative">
      {value ? (
        <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center aspect-square bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
          {uploading ? (
            <div className="text-gray-400 text-sm">업로드 중...</div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-400">이미지 업로드</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
