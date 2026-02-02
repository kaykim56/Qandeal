import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

/**
 * POST /api/admin/migrate-utc-to-kst
 * participations 테이블의 시간 데이터를 UTC에서 KST(+9시간)로 마이그레이션
 */
export async function POST() {
  try {
    const supabase = createServiceRoleClient();

    // 1. 현재 데이터 확인
    const { data: beforeData, error: beforeError } = await supabase
      .from("participations")
      .select("id, created_at, reviewed_at")
      .limit(5);

    if (beforeError) {
      return NextResponse.json({ error: beforeError.message }, { status: 500 });
    }

    console.log("[migrate-utc-to-kst] Before migration sample:", beforeData);

    // 2. created_at 업데이트 (+9시간)
    // Supabase에서는 직접 SQL을 실행해야 하므로 RPC를 사용하거나,
    // 개별 레코드를 업데이트합니다.

    // 모든 participations 조회
    const { data: allParticipations, error: fetchError } = await supabase
      .from("participations")
      .select("id, created_at, reviewed_at");

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    let updatedCount = 0;
    const errors: string[] = [];

    for (const p of allParticipations || []) {
      const updates: { created_at?: string; reviewed_at?: string } = {};

      // created_at을 +9시간
      if (p.created_at) {
        const createdDate = new Date(p.created_at);
        createdDate.setHours(createdDate.getHours() + 9);
        updates.created_at = createdDate.toISOString();
      }

      // reviewed_at을 +9시간 (있는 경우만)
      if (p.reviewed_at) {
        const reviewedDate = new Date(p.reviewed_at);
        reviewedDate.setHours(reviewedDate.getHours() + 9);
        updates.reviewed_at = reviewedDate.toISOString();
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from("participations")
          .update(updates)
          .eq("id", p.id);

        if (updateError) {
          errors.push(`ID ${p.id}: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      }
    }

    // 3. 마이그레이션 후 샘플 확인
    const { data: afterData } = await supabase
      .from("participations")
      .select("id, created_at, reviewed_at")
      .limit(5);

    console.log("[migrate-utc-to-kst] After migration sample:", afterData);

    return NextResponse.json({
      success: true,
      message: `마이그레이션 완료: ${updatedCount}개 레코드 업데이트`,
      totalRecords: allParticipations?.length || 0,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined,
      sampleBefore: beforeData,
      sampleAfter: afterData,
    });
  } catch (error) {
    console.error("[migrate-utc-to-kst] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
