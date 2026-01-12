import { google } from "googleapis";
import { Challenge, ChallengeInput, ChallengeWithMissions, Mission, MissionStep } from "./types";

// Google Sheets 인증
function getAuth() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";

  // \n 문자열을 실제 줄바꿈으로 변환 (두 가지 케이스 모두 처리)
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

// ============================================
// 챌린지 CRUD
// ============================================

export async function getAllChallenges(): Promise<Challenge[]> {
  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "challenges!A2:R",
  });

  const rows = response.data.values || [];
  return rows.map(rowToChallenge);
}

export async function getChallengeById(id: string): Promise<ChallengeWithMissions | null> {
  const sheets = getSheets();

  // 챌린지 데이터 가져오기
  const challengeResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "challenges!A2:R",
  });

  const rows = challengeResponse.data.values || [];
  const row = rows.find((r) => r[0] === id);
  if (!row) return null;

  // 미션 데이터 가져오기
  const missionsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "missions!A2:D",
  });

  const missionRows = missionsResponse.data.values || [];
  const missionData = missionRows.find((r) => r[1] === id);

  // missionSteps 파싱 (하위 호환성 지원)
  const missionSteps = parseMissionSteps(missionData, row[16] || "", row[17] || "");
  const challenge = rowToChallenge(row, missionSteps);

  // 기존 Mission 형식도 유지 (하위 호환)
  const missions = getDefaultMissions(id, missionData);

  return { ...challenge, missions };
}

export async function createChallenge(input: ChallengeInput, createdBy?: string): Promise<string> {
  const sheets = getSheets();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // missionSteps에서 첫 번째 스텝의 deadline을 purchaseDeadline으로 사용 (하위 호환)
  const purchaseDeadline = input.missionSteps?.[0]?.deadline || input.purchaseDeadline || "";
  const reviewDeadline = input.missionSteps?.[1]?.deadline || input.reviewDeadline || "";

  const row = [
    id,
    input.platform,
    input.title,
    input.option,
    "", // 구 purchaseTimeLimit 컬럼 (사용 안 함)
    input.originalPrice,
    input.paybackRate,
    input.paybackAmount,
    input.finalPrice,
    input.productImage,
    input.productLink,
    JSON.stringify(input.detailImages || []),
    input.status,
    now,
    now,
    createdBy || "",
    purchaseDeadline, // 구매 인증 기한 (하위 호환용)
    reviewDeadline, // 리뷰 인증 기한 (하위 호환용)
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "challenges!A:R",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  // 미션 스텝 데이터 생성 (새 형식: stepsJson)
  const missionSteps = input.missionSteps || getDefaultSteps(purchaseDeadline, reviewDeadline, null, null);
  const missionRow = [
    crypto.randomUUID(),
    id,
    JSON.stringify(missionSteps), // stepsJson
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "missions!A:C",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [missionRow] },
  });

  return id;
}

export async function updateChallenge(id: string, input: Partial<ChallengeInput>): Promise<boolean> {
  const sheets = getSheets();

  // 기존 데이터 찾기
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "challenges!A2:R",
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) return false;

  const existing = rowToChallenge(rows[rowIndex]);
  const updated = { ...existing, ...input, updatedAt: new Date().toISOString() };

  // missionSteps에서 deadline 추출 (하위 호환용)
  const purchaseDeadline = updated.missionSteps?.[0]?.deadline || updated.purchaseDeadline || "";
  const reviewDeadline = updated.missionSteps?.[1]?.deadline || updated.reviewDeadline || "";

  const row = [
    updated.id,
    updated.platform,
    updated.title,
    updated.option,
    "", // 구 purchaseTimeLimit 컬럼 (사용 안 함)
    updated.originalPrice,
    updated.paybackRate,
    updated.paybackAmount,
    updated.finalPrice,
    updated.productImage,
    updated.productLink,
    JSON.stringify(updated.detailImages || []),
    updated.status,
    updated.createdAt,
    updated.updatedAt,
    updated.createdBy || "",
    purchaseDeadline,
    reviewDeadline,
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `challenges!A${rowIndex + 2}:R${rowIndex + 2}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  // missionSteps가 있으면 missions 시트도 업데이트
  if (input.missionSteps) {
    await updateMissionSteps(id, input.missionSteps);
  }

  return true;
}

export async function deleteChallenge(id: string): Promise<boolean> {
  const sheets = getSheets();

  // 챌린지 행 찾기
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "challenges!A2:R",
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) return false;

  // 행 삭제 (빈 값으로 덮어쓰기 후 정리는 수동으로)
  // 실제로는 spreadsheetId의 sheetId를 알아야 하므로 간단히 status를 deleted로 변경
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `challenges!M${rowIndex + 2}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [["deleted"]] },
  });

  return true;
}

// 미션 예시 이미지 업데이트 (구 형식 - 하위 호환용)
export async function updateMissionImages(
  challengeId: string,
  purchaseImage: string,
  reviewImage: string
): Promise<boolean> {
  const sheets = getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "missions!A2:D",
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((r) => r[1] === challengeId);

  if (rowIndex === -1) {
    // 새로 생성
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "missions!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[crypto.randomUUID(), challengeId, purchaseImage, reviewImage]],
      },
    });
  } else {
    // 업데이트
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `missions!C${rowIndex + 2}:D${rowIndex + 2}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[purchaseImage, reviewImage]] },
    });
  }

  return true;
}

// 미션 스텝 업데이트 (새 형식)
export async function updateMissionSteps(
  challengeId: string,
  steps: MissionStep[]
): Promise<boolean> {
  const sheets = getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "missions!A2:C",
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((r) => r[1] === challengeId);

  const stepsJson = JSON.stringify(steps);

  if (rowIndex === -1) {
    // 새로 생성
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "missions!A:C",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[crypto.randomUUID(), challengeId, stepsJson]],
      },
    });
  } else {
    // 업데이트
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `missions!C${rowIndex + 2}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[stepsJson]] },
    });
  }

  return true;
}

// ============================================
// 참여 기록 CRUD (participations)
// ============================================

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
  testerEmail?: string; // 어드민 테스트 참여 시 이메일 저장
}

// 참여 생성 (참가하기 버튼 클릭 시)
export async function createParticipation(data: {
  challengeId: string;
  userId: string;
  testerEmail?: string; // 어드민 테스트 시 이메일
}): Promise<string> {
  const sheets = getSheets();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const row = [
    id,
    data.challengeId,
    data.userId,
    "", // purchaseImageUrl
    "", // reviewImageUrl
    "pending", // status
    now, // createdAt
    "", // reviewedAt
    "", // reviewedBy
    data.testerEmail || "", // testerEmail (J열)
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "participations!A:J",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  return id;
}

// 참여 조회 (userId + challengeId로)
export async function getParticipation(
  challengeId: string,
  userId: string
): Promise<Participation | null> {
  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "participations!A2:J",
  });

  const rows = response.data.values || [];
  const row = rows.find((r) => r[1] === challengeId && r[2] === userId);
  if (!row) return null;

  return rowToParticipation(row);
}

// 인증 이미지 업데이트
export async function updateParticipationImage(
  participationId: string,
  stepType: "purchase" | "review",
  imageUrl: string,
  stepOrder?: number
): Promise<boolean> {
  const sheets = getSheets();

  console.log(`[updateParticipationImage] participationId: ${participationId}, stepType: ${stepType}, stepOrder: ${stepOrder}`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "participations!A2:J",
  });

  const rows = response.data.values || [];
  console.log(`[updateParticipationImage] Found ${rows.length} rows in sheet`);

  const rowIndex = rows.findIndex((r) => r[0] === participationId);
  console.log(`[updateParticipationImage] Row index for participationId: ${rowIndex}`);

  if (rowIndex === -1) {
    console.error(`[updateParticipationImage] participationId not found: ${participationId}`);
    return false;
  }

  // 동적 스텝 지원: stepOrder가 주어지면 그에 맞는 컬럼 사용
  // stepOrder 1 → D (purchaseImageUrl), stepOrder 2 → E (reviewImageUrl)
  // stepOrder가 없으면 기존 stepType 로직 사용
  let column: string;
  if (stepOrder !== undefined) {
    column = stepOrder === 1 ? "D" : "E";
  } else {
    column = stepType === "purchase" ? "D" : "E";
  }
  const sheetRow = rowIndex + 2; // +2 because A2 starts at index 0

  console.log(`[updateParticipationImage] Updating column ${column}, row ${sheetRow}`);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `participations!${column}${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[imageUrl]] },
  });

  console.log(`[updateParticipationImage] Successfully updated step ${stepOrder ?? stepType} image`);
  return true;
}

// 모든 참여 조회
export async function getAllParticipations(): Promise<Participation[]> {
  try {
    const sheets = getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "participations!A2:J",
    });

    const rows = response.data.values || [];
    return rows.map(rowToParticipation);
  } catch (error) {
    // 시트가 없는 경우 빈 배열 반환
    console.error("getAllParticipations error:", error);
    return [];
  }
}

// 참여 상태 업데이트 (승인/거절)
export async function updateParticipationStatus(
  id: string,
  status: "approved" | "rejected",
  reviewedBy: string
): Promise<boolean> {
  const sheets = getSheets();

  console.log(`[updateParticipationStatus] id: ${id}, status: ${status}`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "participations!A2:J",
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === id);

  console.log(`[updateParticipationStatus] Row index: ${rowIndex}`);

  if (rowIndex === -1) {
    console.error(`[updateParticipationStatus] Participation not found: ${id}`);
    return false;
  }

  const now = new Date().toISOString();
  const sheetRow = rowIndex + 2;

  // F열(status), G열(createdAt 유지), H열(reviewedAt), I열(reviewedBy)
  // 기존 createdAt 값 유지
  const existingCreatedAt = rows[rowIndex][6] || now;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `participations!F${sheetRow}:I${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[status, existingCreatedAt, now, reviewedBy]] },
  });

  console.log(`[updateParticipationStatus] Successfully updated status to ${status}`);
  return true;
}

function rowToParticipation(row: string[]): Participation {
  return {
    id: row[0] || "",
    challengeId: row[1] || "",
    userId: row[2] || "",
    purchaseImageUrl: row[3] || "",
    reviewImageUrl: row[4] || "",
    status: (row[5] as "pending" | "approved" | "rejected") || "pending",
    createdAt: row[6] || "",
    reviewedAt: row[7] || undefined,
    reviewedBy: row[8] || undefined,
    testerEmail: row[9] || undefined,
  };
}

// ============================================
// 헬퍼 함수
// ============================================

function parseDetailImages(value: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Fallback for old single image format
    return value ? [value] : [];
  }
}

function rowToChallenge(row: string[], missionSteps?: MissionStep[]): Challenge {
  // 구 형식 데이터에서 기본 스텝 생성 (missionSteps가 없는 경우)
  const defaultSteps: MissionStep[] = [
    {
      order: 1,
      title: "구매 인증하기",
      description: "주문일, 주문번호, 주문상품이 보이도록 주문 상세정보를 캡처하여 인증해주세요.",
      exampleImage: null,
      deadline: row[16] || "", // 구 purchaseDeadline
    },
    {
      order: 2,
      title: "리뷰 인증하기",
      description: "제품을 개봉하여 사용/섭취한 사진이 포함된 포토리뷰를 캡처하여 인증해주세요.",
      exampleImage: null,
      deadline: row[17] || "", // 구 reviewDeadline
    },
  ];

  return {
    id: row[0] || "",
    platform: row[1] || "",
    title: row[2] || "",
    option: row[3] || "",
    // row[4]는 구 purchaseTimeLimit 컬럼 (사용 안 함)
    originalPrice: Number(row[5]) || 0,
    paybackRate: Number(row[6]) || 0,
    paybackAmount: Number(row[7]) || 0,
    finalPrice: Number(row[8]) || 0,
    productImage: row[9] || "",
    productLink: row[10] || "",
    detailImages: parseDetailImages(row[11]),
    missionSteps: missionSteps || defaultSteps,
    status: (row[12] as "draft" | "published") || "draft",
    createdAt: row[13] || "",
    updatedAt: row[14] || "",
    createdBy: row[15] || "",
    purchaseDeadline: row[16] || "", // 구매 인증 기한 (하위 호환용)
    reviewDeadline: row[17] || "", // 리뷰 인증 기한 (하위 호환용)
  };
}

// missionSteps 파싱 (하위 호환성 지원)
function parseMissionSteps(missionData: string[] | undefined, purchaseDeadline: string, reviewDeadline: string): MissionStep[] {
  if (!missionData || !missionData[2]) {
    // 데이터가 없으면 기본 스텝 반환
    return getDefaultSteps(purchaseDeadline, reviewDeadline, null, null);
  }

  // 새 형식: stepsJson이 JSON 배열로 저장됨
  if (missionData[2].startsWith("[")) {
    try {
      return JSON.parse(missionData[2]);
    } catch {
      return getDefaultSteps(purchaseDeadline, reviewDeadline, null, null);
    }
  }

  // 구 형식: purchaseExampleImage (C열), reviewExampleImage (D열)
  const purchaseExampleImage = missionData[2] || null;
  const reviewExampleImage = missionData[3] || null;
  return getDefaultSteps(purchaseDeadline, reviewDeadline, purchaseExampleImage, reviewExampleImage);
}

// 기본 스텝 생성 (구 형식 호환)
function getDefaultSteps(
  purchaseDeadline: string,
  reviewDeadline: string,
  purchaseExampleImage: string | null,
  reviewExampleImage: string | null
): MissionStep[] {
  return [
    {
      order: 1,
      title: "구매 인증하기",
      description: "주문일, 주문번호, 주문상품이 보이도록 주문 상세정보를 캡처하여 인증해주세요.",
      exampleImage: purchaseExampleImage,
      deadline: purchaseDeadline,
    },
    {
      order: 2,
      title: "리뷰 인증하기",
      description: "제품을 개봉하여 사용/섭취한 사진이 포함된 포토리뷰를 캡처하여 인증해주세요.",
      exampleImage: reviewExampleImage,
      deadline: reviewDeadline,
    },
  ];
}

// 기본 미션 템플릿
function getDefaultMissions(challengeId: string, missionData?: string[]): Mission[] {
  const purchaseExampleImage = missionData?.[2] || "";
  const reviewExampleImage = missionData?.[3] || "";

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
