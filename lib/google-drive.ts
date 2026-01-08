import { google } from "googleapis";
import { Readable } from "stream";

// Google Drive 인증
function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

function getDrive() {
  const auth = getAuth();
  return google.drive({ version: "v3", auth });
}

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// 이미지 업로드
export async function uploadImage(
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const drive = getDrive();

  const fileMetadata: { name: string; parents?: string[] } = {
    name: `${Date.now()}-${fileName}`,
  };

  if (FOLDER_ID) {
    fileMetadata.parents = [FOLDER_ID];
  }

  const media = {
    mimeType,
    body: Readable.from(file),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, webViewLink, webContentLink",
    supportsAllDrives: true,
  });

  const fileId = response.data.id;

  // 파일을 공개로 설정
  await drive.permissions.create({
    fileId: fileId!,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  // 직접 이미지 URL 반환
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// 이미지 삭제
export async function deleteImage(fileUrl: string): Promise<boolean> {
  try {
    const drive = getDrive();

    // URL에서 파일 ID 추출
    const match = fileUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (!match) return false;

    const fileId = match[1];
    await drive.files.delete({ fileId });

    return true;
  } catch {
    return false;
  }
}
