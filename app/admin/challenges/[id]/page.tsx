"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, X, ExternalLink, Loader2, LinkIcon, ImageIcon, GripVertical, ZoomIn, Eye, EyeOff, Plus, Trash2, ChevronUp, ChevronDown, Upload, Copy } from "lucide-react";
import Link from "next/link";
import { ChallengeWithMissions, MissionStep } from "@/lib/types";
import ChallengePreview from "@/components/ChallengePreview";
import { StepPreset, getAllPresets, saveCustomPreset, deleteCustomPreset, DEFAULT_STEP_PRESETS } from "@/lib/step-presets";
import type { User } from "@supabase/supabase-js";

export default function EditChallengePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const supabase = createBrowserSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [fetchingImage, setFetchingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [form, setForm] = useState({
    platform: "",
    title: "",
    hasSpecificOption: false,
    option: "",
    purchaseDeadline: "",
    reviewDeadline: "",
    productPrice: 0, // 상품가 (배송비 제외)
    hasShippingFee: false, // 배송비 유무
    shippingFee: 0, // 배송비
    originalPrice: 0, // 구매가 (상품가 + 배송비)
    paybackRate: 0,
    paybackAmount: 0,
    finalPrice: 0,
    productImage: "",
    productLink: "",
    detailImages: [] as string[],
    status: "draft" as "draft" | "published" | "deleted",
    purchaseExampleImage: "",
    reviewExampleImage: "",
    missionSteps: [
      {
        order: 1,
        title: "",
        description: "",
        exampleImages: [] as string[],
        deadline: "",
      },
      {
        order: 2,
        title: "",
        description: "",
        exampleImages: [] as string[],
        deadline: "",
      },
    ] as MissionStep[],
  });
  const [newDetailImageUrl, setNewDetailImageUrl] = useState("");
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // 스텝 프리셋 관련 상태
  const [stepPresets, setStepPresets] = useState<StepPreset[]>(DEFAULT_STEP_PRESETS);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [uploadingExampleImage, setUploadingExampleImage] = useState<number | null>(null);

  // Supabase Auth 체크
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
      setAuthChecking(false);
    };

    checkAuth();
  }, [router, supabase]);

  useEffect(() => {
    if (user && id) {
      fetchChallenge();
    }
    // 프리셋 로드
    setStepPresets(getAllPresets());
  }, [user, id]);

  const fetchChallenge = async () => {
    try {
      const res = await fetch(`/api/challenges/${id}`);
      if (!res.ok) {
        router.push("/admin");
        return;
      }
      const data: ChallengeWithMissions = await res.json();
      // 날짜 형식으로 변환 (ISO -> YYYY-MM-DD)
      const formatDate = (isoString: string) => {
        if (!isoString) return "";
        try {
          const date = new Date(isoString);
          return date.toISOString().slice(0, 10);
        } catch {
          return "";
        }
      };

      // missionSteps 변환 (deadline을 date 형식으로)
      const formattedSteps = (data.missionSteps || []).map((step) => ({
        ...step,
        deadline: formatDate(step.deadline),
      }));

      // 하위 호환: productPrice가 없으면 originalPrice 사용
      const productPrice = (data as any).productPrice || data.originalPrice;
      const hasShippingFee = (data as any).hasShippingFee || false;
      const shippingFee = (data as any).shippingFee || 0;

      setForm({
        platform: data.platform,
        title: data.title,
        hasSpecificOption: !!data.option,
        option: data.option,
        purchaseDeadline: formatDate(data.purchaseDeadline),
        reviewDeadline: formatDate(data.reviewDeadline),
        productPrice,
        hasShippingFee,
        shippingFee,
        originalPrice: data.originalPrice,
        paybackRate: data.paybackRate,
        paybackAmount: data.paybackAmount,
        finalPrice: data.finalPrice,
        productImage: data.productImage,
        productLink: data.productLink,
        detailImages: data.detailImages || [],
        status: data.status,
        purchaseExampleImage: data.missions[0]?.exampleImage || "",
        reviewExampleImage: data.missions[1]?.exampleImage || "",
        missionSteps: formattedSteps.length > 0 ? formattedSteps : form.missionSteps,
      });
    } catch (error) {
      console.error("Failed to fetch challenge:", error);
      router.push("/admin");
    } finally {
      setLoading(false);
    }
  };

  // 구매가 자동 계산 (상품가 + 배송비)
  useEffect(() => {
    const shippingFee = form.hasShippingFee ? form.shippingFee : 0;
    const originalPrice = form.productPrice + shippingFee;
    setForm((prev) => ({ ...prev, originalPrice }));
  }, [form.productPrice, form.hasShippingFee, form.shippingFee]);

  // 페이백 비율 & 실구매가 자동 계산 (페이백 금액 기준)
  useEffect(() => {
    const paybackRate = form.originalPrice > 0
      ? Math.round((form.paybackAmount / form.originalPrice) * 100)
      : 0;
    const finalPrice = form.originalPrice - form.paybackAmount;
    setForm((prev) => ({ ...prev, paybackRate, finalPrice }));
  }, [form.originalPrice, form.paybackAmount]);

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

  // 미션 스텝 관리 함수들
  const addMissionStep = () => {
    const newStep: MissionStep = {
      order: form.missionSteps.length + 1,
      title: "",
      description: "",
      exampleImages: [],
      deadline: "",
    };
    setForm({
      ...form,
      missionSteps: [...form.missionSteps, newStep],
    });
  };

  const removeMissionStep = (index: number) => {
    if (form.missionSteps.length <= 1) {
      alert("최소 1개의 인증 스텝이 필요합니다");
      return;
    }
    const newSteps = form.missionSteps.filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, order: i + 1 }));
    setForm({ ...form, missionSteps: newSteps });
  };

  const moveMissionStep = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= form.missionSteps.length) return;

    const newSteps = [...form.missionSteps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    // order 업데이트
    newSteps.forEach((step, i) => step.order = i + 1);
    setForm({ ...form, missionSteps: newSteps });
  };

  const updateMissionStep = (index: number, field: keyof MissionStep, value: string | string[] | null) => {
    const newSteps = [...form.missionSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setForm({ ...form, missionSteps: newSteps });
  };

  // 예시 이미지 추가 (배열에 추가)
  const addExampleImage = (index: number, url: string) => {
    const newSteps = [...form.missionSteps];
    const currentImages = newSteps[index].exampleImages || [];
    newSteps[index] = { ...newSteps[index], exampleImages: [...currentImages, url] };
    setForm({ ...form, missionSteps: newSteps });
  };

  // 예시 이미지 삭제
  const removeExampleImage = (stepIndex: number, imageIndex: number) => {
    const newSteps = [...form.missionSteps];
    const currentImages = [...(newSteps[stepIndex].exampleImages || [])];
    currentImages.splice(imageIndex, 1);
    newSteps[stepIndex] = { ...newSteps[stepIndex], exampleImages: currentImages };
    setForm({ ...form, missionSteps: newSteps });
  };

  // 프리셋 적용
  const applyPreset = (index: number, presetId: string) => {
    if (presetId === "custom") return;
    const preset = stepPresets.find((p) => p.id === presetId);
    if (preset) {
      const newSteps = [...form.missionSteps];
      newSteps[index] = {
        ...newSteps[index],
        title: preset.title,
        description: preset.description,
      };
      setForm({ ...form, missionSteps: newSteps });
    }
  };

  // 템플릿으로 저장
  const saveAsTemplate = (index: number) => {
    const step = form.missionSteps[index];
    if (!step.title.trim() || !step.description.trim()) {
      alert("제목과 설명을 입력해야 템플릿으로 저장할 수 있습니다");
      return;
    }
    saveCustomPreset({ title: step.title, description: step.description });
    setStepPresets(getAllPresets());
    alert("템플릿이 저장되었습니다");
  };

  // 예시 이미지 업로드
  const handleExampleImageUpload = async (index: number, file: File) => {
    setUploadingExampleImage(index);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("challengeId", id);
      formData.append("stepOrder", String(index + 1));

      const res = await fetch("/api/admin/upload-example", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        addExampleImage(index, data.url);
      } else {
        alert("업로드 실패");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("업로드 실패");
    } finally {
      setUploadingExampleImage(null);
    }
  };

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

  // 필수 필드 검증 - 필드 ID와 에러 메시지 반환
  const validateForm = (): { field: string; message: string } | null => {
    if (!form.platform.trim()) return { field: "platform", message: "플랫폼을 입력해주세요" };
    if (!form.title.trim()) return { field: "title", message: "제목을 입력해주세요" };
    // 미션 스텝 검증
    for (let i = 0; i < form.missionSteps.length; i++) {
      const step = form.missionSteps[i];
      if (!step.title.trim()) return { field: `step-${i}-title`, message: `스텝 ${i + 1}의 제목을 입력해주세요` };
      if (!step.description.trim()) return { field: `step-${i}-description`, message: `스텝 ${i + 1}의 설명을 입력해주세요` };
      if (!step.deadline) return { field: `step-${i}-deadline`, message: `스텝 ${i + 1}의 기한을 입력해주세요` };
    }
    if (!form.productPrice || form.productPrice <= 0) return { field: "productPrice", message: "상품가를 입력해주세요" };
    if (!form.paybackAmount || form.paybackAmount <= 0) return { field: "paybackAmount", message: "페이백 금액을 입력해주세요" };
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
      // missionSteps의 첫 번째와 두 번째 deadline을 하위 호환용으로 설정
      const dataToSave = {
        ...form,
        option: form.hasSpecificOption ? form.option : "",
        purchaseDeadline: form.missionSteps[0]?.deadline || "",
        reviewDeadline: form.missionSteps[1]?.deadline || "",
        missionSteps: form.missionSteps,
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

  const handleClone = async () => {
    if (!confirm("이 챌린지를 복제하시겠습니까?\n새로운 ID로 복제본이 생성됩니다.")) {
      return;
    }

    setCloning(true);
    try {
      const res = await fetch("/api/admin/challenges/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: id }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`복제 완료!\n새 URL: /challenge/${data.newId}`);
        // 복제된 챌린지 편집 페이지로 이동
        router.push(`/admin/challenges/${data.newId}`);
      } else {
        alert("복제에 실패했습니다: " + (data.error || "알 수 없는 오류"));
      }
    } catch (error) {
      console.error("Clone failed:", error);
      alert("복제에 실패했습니다");
    } finally {
      setCloning(false);
    }
  };

  const challengeUrl = typeof window !== "undefined"
    ? `${window.location.origin}/challenge/${id}`
    : `/challenge/${id}`;

  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className={`mx-auto px-4 py-4 flex items-center justify-between ${showPreview ? "max-w-7xl" : "max-w-4xl"}`}>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">챌린지 수정</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showPreview
                  ? "bg-orange-100 text-orange-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? "미리보기 숨기기" : "미리보기 보기"}
            </button>
            <Link
              href={`/challenge/${id}`}
              target="_blank"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ExternalLink className="w-4 h-4" />
              새 탭
            </Link>
          </div>
        </div>
      </header>

      {/* 본문: 폼 + 미리보기 */}
      <div className={`mx-auto px-4 py-8 ${showPreview ? "max-w-7xl" : "max-w-4xl"}`}>
        <div className={`${showPreview ? "flex gap-8" : ""}`}>
          {/* 폼 영역 */}
          <main className={`${showPreview ? "flex-1 min-w-0" : ""}`}>
            <form className="space-y-6">
          {/* 기본 정보 */}
          <section className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
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
              <div className="col-span-2">
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
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제품 링크 *
                </label>
                <input
                  id="productLink"
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
                  상품가 (원) *
                </label>
                <input
                  id="productPrice"
                  type="number"
                  value={form.productPrice || ""}
                  onChange={(e) => setForm({ ...form, productPrice: Number(e.target.value) })}
                  placeholder="30000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  배송비
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, hasShippingFee: !form.hasShippingFee, shippingFee: 0 })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      form.hasShippingFee ? "bg-orange-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.hasShippingFee ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  {form.hasShippingFee ? (
                    <input
                      type="number"
                      value={form.shippingFee || ""}
                      onChange={(e) => setForm({ ...form, shippingFee: Number(e.target.value) })}
                      placeholder="3000"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  ) : (
                    <span className="text-sm text-gray-500">무료배송</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  구매가 (자동계산)
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg font-medium">
                  {form.originalPrice.toLocaleString()}원
                  {form.hasShippingFee && form.shippingFee > 0 && (
                    <span className="text-xs text-gray-500 ml-1">
                      (상품 {form.productPrice.toLocaleString()} + 배송 {form.shippingFee.toLocaleString()})
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  페이백 금액 (원) *
                </label>
                <input
                  id="paybackAmount"
                  type="number"
                  value={form.paybackAmount || ""}
                  onChange={(e) => setForm({ ...form, paybackAmount: Number(e.target.value) })}
                  placeholder="12000"
                  min="0"
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
                  페이백 비율 (자동계산)
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg text-orange-500 font-medium">
                  {form.paybackRate}%
                </div>
              </div>
            </div>
          </section>

          {/* 인증 스텝 설정 */}
          <section className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">인증 스텝 설정</h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {form.missionSteps.length}개 스텝
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              사용자가 페이백을 받기 위해 완료해야 하는 인증 단계를 설정합니다.
            </p>

            {/* 스텝 목록 */}
            <div className="space-y-4">
              {form.missionSteps.map((step, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  {/* 스텝 헤더 */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900">
                      스텝 {index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveMissionStep(index, "up")}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="위로 이동"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMissionStep(index, "down")}
                        disabled={index === form.missionSteps.length - 1}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="아래로 이동"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMissionStep(index)}
                        className="p-1 hover:bg-red-100 text-red-500 rounded"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 스텝 내용 */}
                  <div className="space-y-3">
                    {/* 프리셋 드롭다운 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">스텝 유형 선택</label>
                      <div className="flex gap-2">
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value === "__save__") {
                              saveAsTemplate(index);
                            } else if (e.target.value === "__custom__") {
                              updateMissionStep(index, "title", " ");
                              setTimeout(() => updateMissionStep(index, "title", ""), 0);
                            } else if (e.target.value) {
                              applyPreset(index, e.target.value);
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white"
                        >
                          <option value="">-- 유형을 선택하세요 --</option>
                          <optgroup label="기본 유형">
                            {stepPresets.filter((p) => !p.isCustom).map((preset) => (
                              <option key={preset.id} value={preset.id}>
                                {preset.title}
                              </option>
                            ))}
                          </optgroup>
                          {stepPresets.some((p) => p.isCustom) && (
                            <optgroup label="저장된 유형">
                              {stepPresets.filter((p) => p.isCustom).map((preset) => (
                                <option key={preset.id} value={preset.id}>
                                  {preset.title}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <option value="__custom__">직접 입력</option>
                          {step.title && step.description && (
                            <option value="__save__">+ 현재 내용을 새 유형으로 저장</option>
                          )}
                        </select>
                        {stepPresets.some((p) => p.isCustom) && (
                          <button
                            type="button"
                            onClick={() => setShowPresetManager(true)}
                            className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            관리
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 상세 필드 - 항상 표시 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        제목 *
                      </label>
                      <input
                        id={`step-${index}-title`}
                        type="text"
                        value={step.title}
                        onChange={(e) => updateMissionStep(index, "title", e.target.value)}
                        placeholder="예: 구매 인증하기"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        설명 *
                      </label>
                      <textarea
                        id={`step-${index}-description`}
                        value={step.description}
                        onChange={(e) => updateMissionStep(index, "description", e.target.value)}
                        placeholder="인증 방법을 설명해주세요"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        기한 *
                      </label>
                      <input
                        id={`step-${index}-deadline`}
                        type="date"
                        value={step.deadline}
                        onChange={(e) => updateMissionStep(index, "deadline", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        예시 이미지 {(step.exampleImages?.length || 0) > 0 && `(${step.exampleImages.length}개)`}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="URL 입력 후 + 버튼"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const input = e.target as HTMLInputElement;
                              if (input.value.trim()) {
                                addExampleImage(index, input.value.trim());
                                input.value = "";
                              }
                            }
                          }}
                          id={`step-${index}-example-url`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(`step-${index}-example-url`) as HTMLInputElement;
                            if (input?.value.trim()) {
                              addExampleImage(index, input.value.trim());
                              input.value = "";
                            }
                          }}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold"
                        >
                          +
                        </button>
                        <label className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer text-sm flex items-center gap-1">
                          {uploadingExampleImage === index ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleExampleImageUpload(index, file);
                            }}
                            disabled={uploadingExampleImage === index}
                          />
                        </label>
                      </div>
                    </div>
                    {/* 예시 이미지 미리보기 (여러 개) */}
                    {step.exampleImages && step.exampleImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {step.exampleImages.map((img, imgIndex) => (
                          <div key={imgIndex} className="relative">
                            <img
                              src={img}
                              alt={`예시 이미지 ${imgIndex + 1}`}
                              className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeExampleImage(index, imgIndex)}
                              className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 스텝 추가 버튼 */}
            <button
              type="button"
              onClick={addMissionStep}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
            >
              <Plus className="w-5 h-5" />
              스텝 추가
            </button>
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

          {/* 상세 페이지 이미지 (다중) */}
          <section className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">상세 페이지 이미지</h2>
              {form.detailImages.length > 0 ? (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  {form.detailImages.length}개 이미지
                </span>
              ) : (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  이미지 없음
                </span>
              )}
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
                이미지 URL을 입력하고 + 버튼을 누르세요
              </p>
            </div>
          </section>

          {/* 챌린지 URL (게시된 경우) */}
          {form.status === "published" && (
            <section className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              {/* 일반 URL */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-800 mb-1">일반 URL</p>
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
              {/* 딥링크 */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-green-200">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-800 mb-1">딥링크 (앱 배너용)</p>
                  <p className="text-xs text-green-600 truncate font-mono">
                    {`qandadir://web?link=${encodeURIComponent(challengeUrl)}&hiddenTopNavigation=true&hiddenBottomNavigation=true&backOwner=web`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const deepLink = `qandadir://web?link=${encodeURIComponent(challengeUrl)}&hiddenTopNavigation=true&hiddenBottomNavigation=true&backOwner=web`;
                    navigator.clipboard.writeText(deepLink);
                    alert("딥링크가 복사되었습니다!");
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
              onClick={handleClone}
              disabled={cloning || saving}
              className="px-3 py-2 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50 text-sm whitespace-nowrap flex items-center gap-1"
            >
              <Copy className="w-4 h-4" />
              {cloning ? "복제 중..." : "복제"}
            </button>
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

          {/* 미리보기 영역 */}
          {showPreview && (
            <aside className="w-[420px] flex-shrink-0 sticky top-4 self-start hidden lg:block">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3 text-center">실시간 미리보기</h3>
                <div className="transform scale-[0.85] origin-top">
                  <ChallengePreview
                    data={{
                      platform: form.platform,
                      title: form.title,
                      option: form.hasSpecificOption ? form.option : "",
                      purchaseDeadline: form.purchaseDeadline,
                      originalPrice: form.originalPrice,
                      paybackRate: form.paybackRate,
                      paybackAmount: form.paybackAmount,
                      finalPrice: form.finalPrice,
                      productImage: form.productImage,
                      productLink: form.productLink,
                      detailImages: form.detailImages,
                    }}
                  />
                </div>
              </div>
            </aside>
          )}
        </div>
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

      {/* 저장된 유형 관리 모달 */}
      {showPresetManager && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPresetManager(false)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">저장된 유형 관리</h3>
              <button
                onClick={() => setShowPresetManager(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {stepPresets.filter((p) => p.isCustom).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                저장된 유형이 없습니다
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {stepPresets.filter((p) => p.isCustom).map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{preset.title}</p>
                      <p className="text-xs text-gray-500 truncate">{preset.description}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`"${preset.title}" 유형을 삭제하시겠습니까?`)) {
                          deleteCustomPreset(preset.id);
                          setStepPresets(getAllPresets());
                        }
                      }}
                      className="ml-2 p-1.5 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowPresetManager(false)}
              className="mt-4 w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
