import { createServiceRoleClient } from "../supabase";

// =====================================================
// 타입 정의
// =====================================================

export interface Participation {
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
  phoneNumber?: string;
  // 동적 스텝 지원: 모든 이미지 배열 (imageOrder로 정렬)
  images?: Array<{ stepOrder: number; imageOrder: number; imageUrl: string }>;
}

export interface ParticipationWithImages extends Participation {
  images: Array<{
    stepOrder: number;
    imageOrder: number;
    imageUrl: string;
  }>;
}

// =====================================================
// 타입 변환 헬퍼
// =====================================================

function dbToParticipation(
  row: {
    id: string;
    challenge_id: string | null;
    qanda_user_id: string;
    phone_number: string | null;
    tester_email: string | null;
    status: "pending" | "approved" | "rejected";
    reviewed_at: string | null;
    reviewed_by: string | null;
    created_at: string;
    updated_at: string;
  },
  images?: Array<{ step_order: number; image_order?: number; image_url: string }>
): Participation {
  // 이미지 데이터에서 purchaseImageUrl, reviewImageUrl 추출 (하위 호환)
  const purchaseImage = images?.find((i) => i.step_order === 1);
  const reviewImage = images?.find((i) => i.step_order === 2);

  // 모든 이미지 배열 (동적 스텝 지원 + imageOrder로 정렬)
  const allImages = (images || [])
    .sort((a, b) => {
      // stepOrder로 먼저 정렬, 같으면 imageOrder로 정렬
      if (a.step_order !== b.step_order) return a.step_order - b.step_order;
      return (a.image_order || 1) - (b.image_order || 1);
    })
    .map((i) => ({
      stepOrder: i.step_order,
      imageOrder: i.image_order || 1,
      imageUrl: i.image_url,
    }));

  return {
    id: row.id,
    challengeId: row.challenge_id || "",
    userId: row.qanda_user_id,
    purchaseImageUrl: purchaseImage?.image_url || "",
    reviewImageUrl: reviewImage?.image_url || "",
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at || undefined,
    reviewedBy: row.reviewed_by || undefined,
    testerEmail: row.tester_email || undefined,
    phoneNumber: row.phone_number || undefined,
    images: allImages.length > 0 ? allImages : undefined,
  };
}

// =====================================================
// 참여 CRUD (공개용)
// =====================================================

export async function getParticipation(
  challengeId: string,
  userId: string
): Promise<Participation | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("participations")
    .select(`
      *,
      participation_images (step_order, image_order, image_url)
    `)
    .eq("challenge_id", challengeId)
    .eq("qanda_user_id", userId)
    .single();

  if (error || !data) {
    if (error?.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Failed to fetch participation:", error);
    }
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const images = data.participation_images as any as Array<{ step_order: number; image_order?: number; image_url: string }> | undefined;
  return dbToParticipation(data, images);
}

export async function getParticipationByPhone(
  challengeId: string,
  phoneNumber: string
): Promise<Participation | null> {
  const supabase = createServiceRoleClient();

  // 전화번호 정규화 (하이픈 제거)
  const normalizedPhone = phoneNumber.replace(/-/g, "");

  const { data, error } = await supabase
    .from("participations")
    .select(`
      *,
      participation_images (step_order, image_order, image_url)
    `)
    .eq("challenge_id", challengeId)
    .eq("phone_number", normalizedPhone)
    .single();

  if (error || !data) {
    if (error?.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Failed to fetch participation by phone:", error);
    }
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const images = data.participation_images as any as Array<{ step_order: number; image_order?: number; image_url: string }> | undefined;
  return dbToParticipation(data, images);
}

export async function createParticipation(data: {
  challengeId: string;
  userId: string;
  testerEmail?: string;
  phoneNumber?: string;
}): Promise<string> {
  const supabase = createServiceRoleClient();

  const { data: participation, error } = await supabase
    .from("participations")
    .insert({
      challenge_id: data.challengeId,
      qanda_user_id: data.userId,
      tester_email: data.testerEmail || null,
      phone_number: data.phoneNumber || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !participation) {
    console.error("Failed to create participation:", error);
    throw error;
  }

  return participation.id;
}

export async function deleteParticipation(
  challengeId: string,
  userId: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("participations")
    .delete()
    .eq("challenge_id", challengeId)
    .eq("qanda_user_id", userId);

  if (error) {
    console.error("Failed to delete participation:", error);
    return false;
  }

  return true;
}

// =====================================================
// 참여 이미지 관리
// =====================================================

export async function updateParticipationImage(
  participationId: string,
  stepType: "purchase" | "review",
  imageUrl: string,
  stepOrder?: number,
  imageOrder?: number
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  // stepOrder 결정
  const order = stepOrder !== undefined ? stepOrder : stepType === "purchase" ? 1 : 2;
  // imageOrder 결정 (기본값 1)
  const imgOrder = imageOrder !== undefined ? imageOrder : 1;

  console.log(
    `[updateParticipationImage] participationId: ${participationId}, stepType: ${stepType}, stepOrder: ${order}, imageOrder: ${imgOrder}`
  );

  // upsert로 이미지 저장 (기존 것 있으면 업데이트)
  const { error } = await supabase.from("participation_images").upsert(
    {
      participation_id: participationId,
      step_order: order,
      image_order: imgOrder,
      image_url: imageUrl,
    },
    {
      onConflict: "participation_id,step_order,image_order",
    }
  );

  if (error) {
    console.error("Failed to update participation image:", error);
    return false;
  }

  console.log(`[updateParticipationImage] Successfully updated step ${order}, image ${imgOrder}`);
  return true;
}

// =====================================================
// 관리자용 CRUD
// =====================================================

export async function getAllParticipations(): Promise<Participation[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("participations")
    .select(`
      *,
      participation_images (step_order, image_order, image_url)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch participations:", error);
    return [];
  }

  return (data || []).map((row) => {
    const images = row.participation_images as any as Array<{ step_order: number; image_order?: number; image_url: string }> | undefined;
    return dbToParticipation(row, images);
  });
}

export async function getParticipationById(id: string): Promise<Participation | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("participations")
    .select(`
      *,
      participation_images (step_order, image_order, image_url)
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("Failed to fetch participation by id:", error);
    return null;
  }

  const images = data.participation_images as any as Array<{ step_order: number; image_order?: number; image_url: string }> | undefined;
  return dbToParticipation(data, images);
}

export async function updateParticipationStatus(
  id: string,
  status: "approved" | "rejected",
  reviewedBy: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  console.log(`[updateParticipationStatus] id: ${id}, status: ${status}`);

  const { error } = await supabase
    .from("participations")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update participation status:", error);
    return false;
  }

  console.log(`[updateParticipationStatus] Successfully updated status to ${status}`);
  return true;
}

// =====================================================
// 데이터 정리 (관리자용)
// =====================================================

export async function removeDuplicateParticipations(): Promise<{ removed: number }> {
  const supabase = createServiceRoleClient();

  // 모든 참여 조회
  const { data: participations, error: fetchError } = await supabase
    .from("participations")
    .select(`
      *,
      participation_images (step_order, image_order, image_url)
    `)
    .order("created_at", { ascending: false });

  if (fetchError || !participations) {
    console.error("Failed to fetch participations for cleanup:", fetchError);
    return { removed: 0 };
  }

  // 중복 그룹화
  const grouped: Record<string, typeof participations> = {};
  participations.forEach((p) => {
    const key = `${p.challenge_id}|${p.qanda_user_id}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  // 삭제할 ID 수집
  const idsToDelete: string[] = [];

  Object.values(grouped).forEach((group) => {
    if (group.length > 1) {
      // approved 우선, 이미지 있는 것 우선, 최신 우선
      const sorted = group.sort((a, b) => {
        if (a.status === "approved" && b.status !== "approved") return -1;
        if (b.status === "approved" && a.status !== "approved") return 1;

        const aImages = a.participation_images as any as Array<{ step_order: number; image_order?: number; image_url: string }> | undefined;
        const bImages = b.participation_images as any as Array<{ step_order: number; image_order?: number; image_url: string }> | undefined;
        const aHasImage = (aImages?.length || 0) > 0;
        const bHasImage = (bImages?.length || 0) > 0;
        if (aHasImage && !bHasImage) return -1;
        if (bHasImage && !aHasImage) return 1;

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // 첫 번째 제외 나머지 삭제
      sorted.slice(1).forEach((p) => idsToDelete.push(p.id));
    }
  });

  if (idsToDelete.length === 0) {
    return { removed: 0 };
  }

  // 삭제 실행
  const { error: deleteError } = await supabase
    .from("participations")
    .delete()
    .in("id", idsToDelete);

  if (deleteError) {
    console.error("Failed to delete duplicate participations:", deleteError);
    return { removed: 0 };
  }

  return { removed: idsToDelete.length };
}

export async function clearAllParticipations(): Promise<{ removed: number }> {
  const supabase = createServiceRoleClient();

  // 먼저 개수 확인
  const { count } = await supabase
    .from("participations")
    .select("*", { count: "exact", head: true });

  // 전체 삭제
  const { error } = await supabase.from("participations").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    console.error("Failed to clear all participations:", error);
    return { removed: 0 };
  }

  return { removed: count || 0 };
}

export async function clearOrphanedMissions(): Promise<{ removed: number }> {
  const supabase = createServiceRoleClient();

  // 유효한 챌린지 ID 조회
  const { data: challenges } = await supabase.from("challenges").select("id");
  const validIds = new Set(challenges?.map((c) => c.id) || []);

  // 모든 미션 스텝 조회
  const { data: steps } = await supabase.from("mission_steps").select("id, challenge_id");

  // orphaned 미션 찾기
  const orphanedIds = (steps || [])
    .filter((s) => !validIds.has(s.challenge_id || ""))
    .map((s) => s.id);

  if (orphanedIds.length === 0) {
    return { removed: 0 };
  }

  // 삭제
  const { error } = await supabase.from("mission_steps").delete().in("id", orphanedIds);

  if (error) {
    console.error("Failed to clear orphaned missions:", error);
    return { removed: 0 };
  }

  return { removed: orphanedIds.length };
}
