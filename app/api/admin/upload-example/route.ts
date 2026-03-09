import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/supabase";
import { put } from "@vercel/blob";
import { getKSTDateString } from "@/lib/date-utils";

// POST /api/admin/upload-example - 예시 이미지 업로드
export async function POST(request: NextRequest) {
  try {
    const { isAdmin } = await getSessionFromCookie(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const challengeId = formData.get("challengeId") as string;
    const stepOrder = formData.get("stepOrder") as string;

    if (!file) {
      return NextResponse.json({ error: "File required" }, { status: 400 });
    }

    // 파일명 생성 (KST 기준)
    const timestamp = Date.now();
    const dateStr = getKSTDateString();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const pathname = `examples/${challengeId || "new"}/step-${stepOrder || "0"}/${dateStr}_${timestamp}_${sanitizedFilename}`;

    // Vercel Blob에 업로드
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Failed to upload example image:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
