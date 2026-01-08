import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadImage } from "@/lib/google-drive";

// POST /api/upload - 이미지 업로드
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // 이미지 타입 확인
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadImage(buffer, file.name, file.type);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Failed to upload image:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
