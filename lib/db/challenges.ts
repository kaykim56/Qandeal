import { createServiceRoleClient, createServerSupabaseClient } from "../supabase";
import { Challenge, ChallengeInput, ChallengeWithMissions, MissionStep } from "../types";

// =====================================================
// 타입 변환 헬퍼
// =====================================================

function dbToChallenge(
  row: {
    id: string;
    short_id: string | null;
    platform: string;
    title: string;
    option: string | null;
    original_price: number;
    payback_rate: number;
    payback_amount: number;
    final_price: number;
    product_image: string | null;
    product_link: string | null;
    detail_images: unknown;
    status: "draft" | "published" | "deleted";
    created_by: string | null;
    created_at: string;
    updated_at: string;
    purchase_deadline: string | null;
    review_deadline: string | null;
  },
  missionSteps?: MissionStep[]
): Challenge {
  const defaultSteps: MissionStep[] = [
    {
      order: 1,
      title: "구매 인증하기",
      description: "주문일, 주문번호, 주문상품이 보이도록 주문 상세정보를 캡처하여 인증해주세요.",
      exampleImages: [],
      deadline: row.purchase_deadline || "",
    },
    {
      order: 2,
      title: "리뷰 인증하기",
      description: "제품을 개봉하여 사용/섭취한 사진이 포함된 포토리뷰를 캡처하여 인증해주세요.",
      exampleImages: [],
      deadline: row.review_deadline || "",
    },
  ];

  return {
    id: row.id,
    platform: row.platform,
    title: row.title,
    option: row.option || "",
    originalPrice: row.original_price,
    paybackRate: row.payback_rate,
    paybackAmount: row.payback_amount,
    finalPrice: row.final_price,
    productImage: row.product_image || "",
    productLink: row.product_link || "",
    detailImages: Array.isArray(row.detail_images) ? (row.detail_images as string[]) : [],
    missionSteps: missionSteps || defaultSteps,
    status: row.status,
    createdBy: row.created_by || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    purchaseDeadline: row.purchase_deadline || "",
    reviewDeadline: row.review_deadline || "",
  };
}

function dbStepsToMissionSteps(
  steps: Array<{
    step_order: number;
    title: string;
    description: string | null;
    example_images: unknown;
    deadline: string | null;
  }>
): MissionStep[] {
  return steps
    .sort((a, b) => a.step_order - b.step_order)
    .map((step) => ({
      order: step.step_order,
      title: step.title,
      description: step.description || "",
      exampleImages: Array.isArray(step.example_images) ? (step.example_images as string[]) : [],
      deadline: step.deadline || "",
    }));
}

// =====================================================
// 챌린지 CRUD (공개 읽기용 - anon key)
// =====================================================

export async function getAllChallenges(): Promise<Challenge[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch challenges:", error);
    throw error;
  }

  return (data || []).map((row) => dbToChallenge(row));
}

export async function getChallengeById(id: string): Promise<ChallengeWithMissions | null> {
  const supabase = createServiceRoleClient();

  // UUID 형식인지 확인 (UUID는 36자, short_id는 8자)
  const isUUID = id.length === 36 && id.includes("-");

  // 챌린지 조회 (UUID 또는 short_id로)
  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("*")
    .eq(isUUID ? "id" : "short_id", id)
    .single();

  if (challengeError || !challenge) {
    console.error("Failed to fetch challenge:", challengeError);
    return null;
  }

  // 미션 스텝 조회
  const { data: steps, error: stepsError } = await supabase
    .from("mission_steps")
    .select("*")
    .eq("challenge_id", id)
    .order("step_order", { ascending: true });

  if (stepsError) {
    console.error("Failed to fetch mission steps:", stepsError);
  }

  const missionSteps = steps && steps.length > 0 ? dbStepsToMissionSteps(steps) : undefined;
  const challengeData = dbToChallenge(challenge, missionSteps);

  // 기존 Mission 형식도 유지 (하위 호환)
  const missions = getDefaultMissions(id, missionSteps);

  return { ...challengeData, missions };
}

// =====================================================
// 챌린지 CRUD (관리자용 - service role)
// =====================================================

export async function createChallenge(input: ChallengeInput, createdBy?: string): Promise<string> {
  const supabase = createServiceRoleClient();

  // missionSteps에서 deadline 추출 (하위 호환용)
  const purchaseDeadline = input.missionSteps?.[0]?.deadline || input.purchaseDeadline || null;
  const reviewDeadline = input.missionSteps?.[1]?.deadline || input.reviewDeadline || null;

  // 챌린지 생성
  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .insert({
      platform: input.platform,
      title: input.title,
      option: input.option || null,
      original_price: input.originalPrice,
      payback_rate: input.paybackRate,
      payback_amount: input.paybackAmount,
      final_price: input.finalPrice,
      product_image: input.productImage || null,
      product_link: input.productLink || null,
      detail_images: input.detailImages || [],
      status: input.status,
      created_by: createdBy || null,
      purchase_deadline: purchaseDeadline,
      review_deadline: reviewDeadline,
    })
    .select("id")
    .single();

  if (challengeError || !challenge) {
    console.error("Failed to create challenge:", challengeError);
    throw challengeError;
  }

  // 미션 스텝 생성
  const missionSteps = input.missionSteps || getDefaultSteps(purchaseDeadline, reviewDeadline);

  if (missionSteps.length > 0) {
    const { error: stepsError } = await supabase.from("mission_steps").insert(
      missionSteps.map((step) => ({
        challenge_id: challenge.id,
        step_order: step.order,
        title: step.title,
        description: step.description || null,
        example_images: step.exampleImages || [],
        deadline: step.deadline || null,
      }))
    );

    if (stepsError) {
      console.error("Failed to create mission steps:", stepsError);
    }
  }

  return challenge.id;
}

export async function updateChallenge(id: string, input: Partial<ChallengeInput>): Promise<boolean> {
  const supabase = createServiceRoleClient();

  // 업데이트할 필드 준비
  const updateData: Record<string, unknown> = {};

  if (input.platform !== undefined) updateData.platform = input.platform;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.option !== undefined) updateData.option = input.option || null;
  if (input.originalPrice !== undefined) updateData.original_price = input.originalPrice;
  if (input.paybackRate !== undefined) updateData.payback_rate = input.paybackRate;
  if (input.paybackAmount !== undefined) updateData.payback_amount = input.paybackAmount;
  if (input.finalPrice !== undefined) updateData.final_price = input.finalPrice;
  if (input.productImage !== undefined) updateData.product_image = input.productImage || null;
  if (input.productLink !== undefined) updateData.product_link = input.productLink || null;
  if (input.detailImages !== undefined) updateData.detail_images = input.detailImages || [];
  if (input.status !== undefined) updateData.status = input.status;

  // missionSteps에서 deadline 추출 (하위 호환용)
  if (input.missionSteps) {
    updateData.purchase_deadline = input.missionSteps[0]?.deadline || null;
    updateData.review_deadline = input.missionSteps[1]?.deadline || null;
  } else {
    if (input.purchaseDeadline !== undefined) updateData.purchase_deadline = input.purchaseDeadline || null;
    if (input.reviewDeadline !== undefined) updateData.review_deadline = input.reviewDeadline || null;
  }

  // 챌린지 업데이트
  const { error: updateError } = await supabase
    .from("challenges")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    console.error("Failed to update challenge:", updateError);
    return false;
  }

  // 미션 스텝 업데이트
  if (input.missionSteps) {
    await updateMissionSteps(id, input.missionSteps);
  }

  return true;
}

export async function deleteChallenge(id: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  // soft delete (status를 deleted로 변경)
  const { error } = await supabase
    .from("challenges")
    .update({ status: "deleted" })
    .eq("id", id);

  if (error) {
    console.error("Failed to delete challenge:", error);
    return false;
  }

  return true;
}

// =====================================================
// 미션 스텝 관리
// =====================================================

export async function updateMissionSteps(challengeId: string, steps: MissionStep[]): Promise<boolean> {
  const supabase = createServiceRoleClient();

  // 기존 스텝 삭제
  const { error: deleteError } = await supabase
    .from("mission_steps")
    .delete()
    .eq("challenge_id", challengeId);

  if (deleteError) {
    console.error("Failed to delete existing mission steps:", deleteError);
    return false;
  }

  // 새 스텝 삽입
  if (steps.length > 0) {
    const { error: insertError } = await supabase.from("mission_steps").insert(
      steps.map((step) => ({
        challenge_id: challengeId,
        step_order: step.order,
        title: step.title,
        description: step.description || null,
        example_images: step.exampleImages || [],
        deadline: step.deadline || null,
      }))
    );

    if (insertError) {
      console.error("Failed to insert mission steps:", insertError);
      return false;
    }
  }

  return true;
}

// =====================================================
// 헬퍼 함수
// =====================================================

function getDefaultSteps(purchaseDeadline: string | null, reviewDeadline: string | null): MissionStep[] {
  return [
    {
      order: 1,
      title: "구매 인증하기",
      description: "주문일, 주문번호, 주문상품이 보이도록 주문 상세정보를 캡처하여 인증해주세요.",
      exampleImages: [],
      deadline: purchaseDeadline || "",
    },
    {
      order: 2,
      title: "리뷰 인증하기",
      description: "제품을 개봉하여 사용/섭취한 사진이 포함된 포토리뷰를 캡처하여 인증해주세요.",
      exampleImages: [],
      deadline: reviewDeadline || "",
    },
  ];
}

function getDefaultMissions(challengeId: string, missionSteps?: MissionStep[]) {
  const purchaseExampleImage = missionSteps?.[0]?.exampleImages?.[0] || "";
  const reviewExampleImage = missionSteps?.[1]?.exampleImages?.[0] || "";

  return [
    {
      id: "mission-1",
      challengeId,
      order: 1,
      title: "구매 인증하기",
      steps: [
        "주문일, 주문번호, 주문상품이 보이도록 주문 상세정보를 캡처하여 인증해주세요.",
      ],
      note: "• 오후 11시 59분 59초 전까지 인증",
      exampleImage: purchaseExampleImage || null,
    },
    {
      id: "mission-2",
      challengeId,
      order: 2,
      title: "제품 리뷰 인증하기",
      steps: [
        "제품을 개봉하여 사용/섭취한 사진이 포함된 포토리뷰를 캡처하여 인증해주세요.",
      ],
      note: null,
      exampleImage: reviewExampleImage || null,
    },
  ];
}

// =====================================================
// 데이터 정리 (관리자용)
// =====================================================

export async function removeDeletedChallenges(): Promise<{ removed: number }> {
  const supabase = createServiceRoleClient();

  // 실제 삭제 (soft delete된 것들)
  const { data, error } = await supabase
    .from("challenges")
    .delete()
    .eq("status", "deleted")
    .select("id");

  if (error) {
    console.error("Failed to remove deleted challenges:", error);
    throw error;
  }

  return { removed: data?.length || 0 };
}

export async function getCleanupDiagnosis() {
  const supabase = createServiceRoleClient();

  // 챌린지 통계
  const { data: challenges } = await supabase.from("challenges").select("id, status");
  const challengeStats = {
    total: challenges?.length || 0,
    published: challenges?.filter((c) => c.status === "published").length || 0,
    draft: challenges?.filter((c) => c.status === "draft").length || 0,
    deleted: challenges?.filter((c) => c.status === "deleted").length || 0,
  };

  // 참여 통계
  const { data: participations } = await supabase.from("participations").select("id, challenge_id, qanda_user_id, status");
  const participationStats = {
    total: participations?.length || 0,
    pending: participations?.filter((p) => p.status === "pending").length || 0,
    approved: participations?.filter((p) => p.status === "approved").length || 0,
    rejected: participations?.filter((p) => p.status === "rejected").length || 0,
    duplicates: [] as Array<{ challengeId: string; userId: string; count: number }>,
  };

  // 중복 참여 체크
  const participationKeys: Record<string, number> = {};
  participations?.forEach((p) => {
    const key = `${p.challenge_id}|${p.qanda_user_id}`;
    participationKeys[key] = (participationKeys[key] || 0) + 1;
  });
  participationStats.duplicates = Object.entries(participationKeys)
    .filter(([, count]) => count > 1)
    .map(([key, count]) => {
      const [challengeId, userId] = key.split("|");
      return { challengeId, userId, count };
    });

  // 미션 통계
  const { data: missionSteps } = await supabase.from("mission_steps").select("id, challenge_id");
  const missionStats = {
    total: missionSteps?.length || 0,
    orphaned: 0,
  };

  // Orphaned 미션 체크
  const challengeIds = new Set(challenges?.map((c) => c.id) || []);
  missionStats.orphaned = missionSteps?.filter((m) => !challengeIds.has(m.challenge_id || "")).length || 0;

  return {
    challenges: challengeStats,
    participations: participationStats,
    missions: missionStats,
  };
}
