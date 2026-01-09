"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, Save, X, Loader2, ImageIcon, Sparkles, ExternalLink, Check, GripVertical, ZoomIn } from "lucide-react";
import Link from "next/link";
import ChallengePreview from "@/components/ChallengePreview";

const AUTOSAVE_KEY = "challenge-draft";

export default function NewChallengePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [form, setForm] = useState({
    platform: "",
    title: "",
    hasSpecificOption: false,
    option: "",
    purchaseDeadline: "", // 구매 인증 기한 (datetime-local)
    reviewDeadline: "", // 리뷰 인증 기한 (datetime-local)
    originalPrice: 0,
    paybackRate: 0,
    paybackAmount: 0,
    finalPrice: 0,
    productImage: "",
    productLink: "",
    detailImages: [] as string[],
    status: "draft" as "draft" | "published",
    purchaseExampleImage: "",
    reviewExampleImage: "",
  });
  const [newDetailImageUrl, setNewDetailImageUrl] = useState("");
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // localStorage에서 임시저장 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setForm(parsed);
      } catch (e) {
        console.error("Failed to load draft:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

  // 자동저장 함수
  const autoSave = useCallback(() => {
    setAutoSaveStatus("saving");
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(form));
    setTimeout(() => {
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    }, 300);
  }, [form]);

  // 폼 변경 시 자동저장 (3초 디바운스)
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // 빈 폼이면 저장 안 함
    if (!form.productLink && !form.title && !form.platform) {
      return;
    }

    autoSaveTimerRef.current = setTimeout(() => {
      autoSave();
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [form, autoSave]);

  // 페이백 금액 자동 계산
  useEffect(() => {
    const paybackAmount = Math.round(form.originalPrice * (form.paybackRate / 100));
    const finalPrice = form.originalPrice - paybackAmount;
    setForm((prev) => ({ ...prev, paybackAmount, finalPrice }));
  }, [form.originalPrice, form.paybackRate]);

  // 제품 링크에서 정보 자동 가져오기
  const fetchProductInfo = async () => {
    if (!form.productLink) {
      setFetchError("제품 링크를 먼저 입력해주세요");
      return;
    }

    setFetchingProduct(true);
    setFetchError(null);
    setFetchSuccess(null);

    try {
      const res = await fetch("/api/fetch-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.productLink }),
      });
      const data = await res.json();

      if (data.error) {
        setFetchError(data.error);
        return;
      }

      // 가져온 정보로 폼 업데이트
      const updates: Partial<typeof form> = {};
      const fetched: string[] = [];

      if (data.title && !form.title) {
        updates.title = data.title;
        fetched.push("제목");
      }
      if (data.platform && !form.platform) {
        updates.platform = data.platform;
        fetched.push("플랫폼");
      }
      if (data.price && !form.originalPrice) {
        updates.originalPrice = data.price;
        fetched.push("가격");
      }
      if (data.image && !form.productImage) {
        updates.productImage = data.image;
        fetched.push("이미지");
      }
      if (data.detailImages && data.detailImages.length > 0 && form.detailImages.length === 0) {
        updates.detailImages = data.detailImages;
        fetched.push(`상세이미지 ${data.detailImages.length}개`);
      } else if (data.detailImage && form.detailImages.length === 0) {
        // 단일 이미지 fallback
        updates.detailImages = [data.detailImage];
        fetched.push("상세이미지");
      }

      if (Object.keys(updates).length > 0) {
        setForm((prev) => ({ ...prev, ...updates }));
        setFetchSuccess(`${fetched.join(", ")} 정보를 가져왔습니다!`);
      } else {
        setFetchError("새로 가져올 정보가 없습니다 (이미 입력된 필드는 덮어쓰지 않습니다)");
      }
    } catch (error) {
      console.error("Fetch product failed:", error);
      setFetchError("제품 정보 가져오기 실패. 직접 입력해주세요.");
    } finally {
      setFetchingProduct(false);
    }
  };

  // 필수 필드 검증 - 필드 ID와 에러 메시지 반환
  const validateForm = (): { field: string; message: string } | null => {
    if (!form.platform.trim()) return { field: "platform", message: "플랫폼을 입력해주세요" };
    if (!form.title.trim()) return { field: "title", message: "제목을 입력해주세요" };
    if (!form.purchaseDeadline) return { field: "purchaseDeadline", message: "구매 인증 기한을 입력해주세요" };
    if (!form.reviewDeadline) return { field: "reviewDeadline", message: "리뷰 인증 기한을 입력해주세요" };
    if (new Date(form.purchaseDeadline) > new Date(form.reviewDeadline)) {
      return { field: "reviewDeadline", message: "구매 인증 기한은 리뷰 인증 기한보다 빠르거나 같아야 합니다" };
    }
    if (!form.originalPrice || form.originalPrice <= 0) return { field: "originalPrice", message: "구매가를 입력해주세요" };
    if (!form.paybackRate || form.paybackRate <= 0) return { field: "paybackRate", message: "페이백 비율을 입력해주세요" };
    if (!form.productLink.trim()) return { field: "productLink", message: "제품 링크를 입력해주세요" };
    if (form.hasSpecificOption && !form.option.trim()) return { field: "option", message: "옵션을 입력하거나 옵션 지정을 해제해주세요" };
    return null;
  };

  // 필드로 스크롤 및 포커스
  const focusField = (fieldId: string) => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => element.focus(), 300);
    }
  };

  const handleSave = async (status: "draft" | "published", openPreview = false) => {
    // 게시할 때만 필수 필드 검증
    if (status === "published") {
      const error = validateForm();
      if (error) {
        alert(error.message);
        focusField(error.field);
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

      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });

      if (res.ok) {
        const data = await res.json();
        // 저장 성공 시 localStorage 초기화
        localStorage.removeItem(AUTOSAVE_KEY);
        if (openPreview) {
          window.open(`/challenge/${data.id}`, "_blank");
        }
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

  // 임시저장 초기화
  const clearDraft = () => {
    if (confirm("작성 중인 내용을 모두 삭제하시겠습니까?")) {
      localStorage.removeItem(AUTOSAVE_KEY);
      setForm({
        platform: "",
        title: "",
        hasSpecificOption: false,
        option: "",
        purchaseDeadline: "",
        reviewDeadline: "",
        originalPrice: 0,
        paybackRate: 0,
        paybackAmount: 0,
        finalPrice: 0,
        productImage: "",
        productLink: "",
        detailImages: [],
        status: "draft",
        purchaseExampleImage: "",
        reviewExampleImage: "",
      });
      setNewDetailImageUrl("");
    }
  };

  // 상세 이미지 추가
  const addDetailImage = () => {
    if (newDetailImageUrl.trim()) {
      setForm({ ...form, detailImages: [...form.detailImages, newDetailImageUrl.trim()] });
      setNewDetailImageUrl("");
    }
  };

  // 상세 이미지 삭제
  const removeDetailImage = (index: number) => {
    setForm({
      ...form,
      detailImages: form.detailImages.filter((_, i) => i !== index),
    });
  };

  // 드래그 앤 드롭으로 이미지 순서 변경
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...form.detailImages];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);

    setForm({ ...form, detailImages: newImages });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // 더미 데이터 채우기
  const fillDummyData = () => {
    setForm({
      ...form,
      productLink: "https://gift.kakao.com/product/11944600",
    });
    setFetchError(null);
    setFetchSuccess(null);
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
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">새 챌린지</h1>
            {/* 자동저장 상태 */}
            {autoSaveStatus !== "idle" && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                {autoSaveStatus === "saving" && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="hidden sm:inline">저장 중...</span>
                  </>
                )}
                {autoSaveStatus === "saved" && (
                  <>
                    <Check className="w-3 h-3 text-green-500" />
                    <span className="hidden sm:inline text-green-500">저장됨</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fillDummyData}
              className="hidden sm:block px-2 py-1 text-xs text-blue-500 hover:text-blue-700"
            >
              테스트
            </button>
            <button
              type="button"
              onClick={clearDraft}
              className="px-2 py-1 text-xs text-gray-500 hover:text-red-500"
            >
              초기화
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠: 폼 + 미리보기 */}
      <div className="lg:flex">
        {/* 왼쪽: 폼 영역 */}
        <main className="flex-1 px-4 py-6 lg:pr-[440px]">
          <div className="max-w-2xl mx-auto lg:mx-0">
            <form className="space-y-4 sm:space-y-6">
          {/* 제품 링크 (맨 위) */}
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. 제품 링크로 정보 가져오기</h2>
            <div className="flex gap-2">
              <input
                id="productLink"
                type="url"
                value={form.productLink}
                onChange={(e) => {
                  setForm({ ...form, productLink: e.target.value });
                  setFetchError(null);
                  setFetchSuccess(null);
                }}
                placeholder="https://gift.kakao.com/product/..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                required
              />
              <button
                type="button"
                onClick={fetchProductInfo}
                disabled={fetchingProduct || !form.productLink}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {fetchingProduct ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {fetchingProduct ? "가져오는 중..." : "정보 가져오기"}
              </button>
            </div>
            {fetchError && (
              <p className="mt-2 text-sm text-red-600">{fetchError}</p>
            )}
            {fetchSuccess && (
              <p className="mt-2 text-sm text-green-600">{fetchSuccess}</p>
            )}
            <p className="mt-2 text-xs text-blue-600">
              링크를 입력하고 버튼을 누르면 제목, 가격, 이미지, 옵션을 자동으로 가져옵니다
            </p>
          </section>

          {/* 기본 정보 */}
          <section className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">2. 기본 정보</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  플랫폼 *
                </label>
                <input
                  id="platform"
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
                  구매 인증 기한 *
                </label>
                <input
                  id="purchaseDeadline"
                  type="datetime-local"
                  value={form.purchaseDeadline}
                  onChange={(e) => setForm({ ...form, purchaseDeadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  리뷰 인증 기한 *
                </label>
                <input
                  id="reviewDeadline"
                  type="datetime-local"
                  value={form.reviewDeadline}
                  onChange={(e) => setForm({ ...form, reviewDeadline: e.target.value })}
                  min={form.purchaseDeadline}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">구매 인증 기한 이후여야 합니다</p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목 *
                </label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="예: 수플린 달콤한 설향 딸기 800g 구매하기"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="sm:col-span-2">
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
                    id="option"
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
            </div>
          </section>

          {/* 가격 정보 */}
          <section className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">3. 가격 정보</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  구매가 (원) *
                </label>
                <input
                  id="originalPrice"
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
                  id="paybackRate"
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

          {/* 제품 이미지 */}
          <section className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">4. 제품 이미지</h2>

            {/* 이미지 미리보기 */}
            {form.productImage && (
              <div className="mb-4 relative inline-block">
                <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={form.productImage}
                    alt="제품 이미지"
                    className="w-full h-full object-cover"
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

            {/* 직접 URL 입력 */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <ImageIcon className="w-4 h-4" />
                이미지 URL
              </label>
              <input
                type="url"
                value={form.productImage}
                onChange={(e) => setForm({ ...form, productImage: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                &quot;정보 가져오기&quot; 버튼으로 자동 입력되거나, 직접 URL을 입력하세요
              </p>
            </div>
          </section>

          {/* 상세 페이지 이미지 (다중) */}
          <section className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">5. 상세 페이지 이미지</h2>
              {form.detailImages.length > 0 ? (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  {form.detailImages.length}개 이미지
                </span>
              ) : fetchSuccess && !fetchSuccess.includes("상세이미지") ? (
                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                  자동 fetch 실패 - 직접 입력 필요
                </span>
              ) : null}
            </div>

            {/* 등록된 이미지 목록 */}
            {form.detailImages.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">드래그하여 순서 변경 | 클릭하여 확대</p>
                <div className="flex flex-wrap gap-2">
                  {form.detailImages.map((img, index) => (
                    <div
                      key={index}
                      className={`relative group cursor-move ${draggedIndex === index ? "opacity-50" : ""}`}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      {/* 드래그 핸들 */}
                      <div className="absolute top-0 left-0 right-0 h-5 bg-gradient-to-b from-black/40 to-transparent rounded-t-lg flex items-center justify-center z-10">
                        <GripVertical className="w-3 h-3 text-white" />
                      </div>
                      <div
                        className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:ring-2 hover:ring-orange-400 transition-all"
                        onClick={() => setExpandedImage(img)}
                      >
                        <img
                          src={img}
                          alt={`상세 이미지 ${index + 1}`}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <span className="absolute bottom-0.5 left-0.5 px-1 text-[10px] bg-black/50 text-white rounded">
                        {index + 1}
                      </span>
                      {/* 확대 아이콘 */}
                      <button
                        type="button"
                        onClick={() => setExpandedImage(img)}
                        className="absolute bottom-0.5 right-0.5 p-0.5 bg-black/50 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ZoomIn className="w-3 h-3" />
                      </button>
                      {/* 삭제 버튼 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDetailImage(index);
                        }}
                        className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 rounded-full text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 새 이미지 URL 입력 */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <ImageIcon className="w-4 h-4" />
                이미지 URL 추가
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newDetailImageUrl}
                  onChange={(e) => setNewDetailImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDetailImage();
                    }
                  }}
                  placeholder="https://example.com/detail-image.jpg"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addDetailImage}
                  disabled={!newDetailImageUrl.trim()}
                  className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-bold"
                >
                  +
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                위 &quot;정보 가져오기&quot; 버튼으로 자동 입력되거나, URL을 입력하고 + 버튼을 누르세요
              </p>
            </div>
          </section>

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
              onClick={() => handleSave("draft", true)}
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
          </div>
        </main>

        {/* 오른쪽: 미리보기 (데스크톱만) - 고정 위치 */}
        <aside className="hidden lg:block fixed right-0 top-14 w-[420px] h-[calc(100vh-56px)] overflow-y-auto bg-white border-l border-gray-200">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-medium text-gray-700">실시간 미리보기</span>
          </div>
          <div className="p-4">
            <ChallengePreview data={form} />
          </div>
        </aside>
      </div>

      {/* 이미지 확대 모달 */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto">
            <button
              type="button"
              onClick={() => setExpandedImage(null)}
              className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 z-10"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
            <img
              src={expandedImage}
              alt="확대 이미지"
              className="max-w-full h-auto rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
