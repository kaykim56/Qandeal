import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { updateParticipationImage } from "@/lib/db/participations";

// POST /api/verify/upload - 인증 사진 업로드 (Vercel Blob)
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const participationId = formData.get("participationId") as string;
    const stepType = formData.get("stepType") as "purchase" | "review";
    const stepOrderStr = formData.get("stepOrder") as string | null;
    const stepOrder = stepOrderStr ? parseInt(stepOrderStr, 10) : undefined;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    }

    if (!participationId) {
      return NextResponse.json({ error: "participationId가 필요합니다" }, { status: 400 });
    }

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일 크기는 10MB 이하여야 합니다" },
        { status: 400 }
      );
    }

    // 이미지 파일만 허용
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 업로드 가능합니다" },
        { status: 400 }
      );
    }

    // 파일명 생성
    const timestamp = Date.now();
    const dateStr = new Date().toISOString().split("T")[0];
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    // 동적 스텝인 경우 step-{order}, 기존 형식인 경우 stepType 사용
    const stepFolder = stepOrder !== undefined ? `step-${stepOrder}` : stepType;
    const pathname = `participations/${participationId}/${stepFolder}/${dateStr}_${timestamp}_${sanitizedFilename}`;

    // Vercel Blob에 업로드
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
    });

    console.log(`[verify/upload] Blob uploaded: ${blob.url}`);
    console.log(`[verify/upload] participationId: ${participationId}, stepType: ${stepType}, stepOrder: ${stepOrder}`);

    // Supabase에서 참여 이미지 저장
    const dbSuccess = await updateParticipationImage(participationId, stepType, blob.url, stepOrder);

    if (!dbSuccess) {
      console.error(`[verify/upload] Failed to save image to DB for participation: ${participationId}`);
      // DB 저장 실패해도 Blob URL은 반환 (UI에서는 보이지만 DB에는 없음)
      // 이 경우 에러를 반환하도록 변경
      return NextResponse.json(
        { error: "이미지 업로드는 성공했으나 DB 저장에 실패했습니다" },
        { status: 500 }
      );
    }

    console.log(`[verify/upload] Successfully saved to DB`);

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "업로드 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
