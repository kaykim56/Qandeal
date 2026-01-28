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

    // Supabase에서 참여 레코드 업데이트
    await updateParticipationImage(participationId, stepType, blob.url, stepOrder);

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
