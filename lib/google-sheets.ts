import { google } from "googleapis";
import { nanoid } from "nanoid";
import { Challenge, ChallengeInput, ChallengeWithMissions, Mission, MissionStep } from "./types";
import { getKSTISOString } from "./date-utils";

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
  return rows.map((row) => rowToChallenge(row));
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
  if (!row) {
    return null;
  }

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
  const id = nanoid(8);
  const now = getKSTISOString();

  // missionSteps에서 첫 번째 스텝의 deadline을 purchaseDeadline으로, 마지막 스텝을 reviewDeadline으로 사용 (하위 호환)
  const purchaseDeadline = input.missionSteps?.[0]?.deadline || input.purchaseDeadline || "";
  const lastStepIndex = (input.missionSteps?.length || 0) - 1;
  const reviewDeadline = lastStepIndex >= 0 ? input.missionSteps?.[lastStepIndex]?.deadline || "" : input.reviewDeadline || "";

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

  // 마지막 행 번호 찾기
  const existingData = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "challenges!A:A",
  });
  const lastRow = (existingData.data.values?.length || 1) + 1;

  // 정확한 위치에 데이터 삽입 (append 대신 update 사용)
  const appendResult = await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `challenges!A${lastRow}:R${lastRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  // 미션 스텝 데이터 생성 (새 형식: stepsJson)
  const missionSteps = input.missionSteps || getDefaultSteps(purchaseDeadline, reviewDeadline, null, null);
  const missionRow = [
    nanoid(8),
    id,
    JSON.stringify(missionSteps), // stepsJson
  ];

  // missions 시트도 정확한 위치에 삽입
  const existingMissions = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "missions!A:A",
  });
  const lastMissionRow = (existingMissions.data.values?.length || 1) + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `missions!A${lastMissionRow}:C${lastMissionRow}`,
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
  const updated = { ...existing, ...input, updatedAt: getKSTISOString() };

  // missionSteps에서 deadline 추출 (하위 호환용) - 마지막 스텝을 reviewDeadline으로
  const purchaseDeadline = updated.missionSteps?.[0]?.deadline || updated.purchaseDeadline || "";
  const lastStepIdx = (updated.missionSteps?.length || 0) - 1;
  const reviewDeadline = lastStepIdx >= 0 ? updated.missionSteps?.[lastStepIdx]?.deadline || "" : updated.reviewDeadline || "";

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
        values: [[nanoid(8), challengeId, purchaseImage, reviewImage]],
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
        values: [[nanoid(8), challengeId, stepsJson]],
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
  phoneNumber?: string; // 전화번호 (페이백용)
}

// 참여 생성 (참가하기 버튼 클릭 시)
export async function createParticipation(data: {
  challengeId: string;
  userId: string;
  testerEmail?: string; // 어드민 테스트 시 이메일
  phoneNumber?: string; // 전화번호 (페이백용)
}): Promise<string> {
  const sheets = getSheets();
  const id = nanoid(8);
  const now = getKSTISOString();

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
    data.phoneNumber || "", // phoneNumber (K열)
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "participations!A:K",
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
    range: "participations!A2:K",
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

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "participations!A2:K",
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === participationId);

  if (rowIndex === -1) {
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

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `participations!${column}${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[imageUrl]] },
  });

  return true;
}

// 모든 참여 조회
export async function getAllParticipations(): Promise<Participation[]> {
  try {
    const sheets = getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "participations!A2:K",
    });

    const rows = response.data.values || [];
    return rows.map(rowToParticipation);
  } catch {
    // 시트가 없는 경우 빈 배열 반환
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

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "participations!A2:K",
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === id);

  if (rowIndex === -1) {
    return false;
  }

  const now = getKSTISOString();
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

  return true;
}

// 참여 삭제 (테스터 초기화용)
export async function deleteParticipation(
  challengeId: string,
  userId: string
): Promise<boolean> {
  const sheets = getSheets();

  // 시트 ID 가져오기
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
  });

  const participationsSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === "participations"
  );

  if (!participationsSheet?.properties?.sheetId) {
    return false;
  }

  const sheetId = participationsSheet.properties.sheetId;

  // 행 찾기
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "participations!A2:K",
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((r) => r[1] === challengeId && r[2] === userId);

  if (rowIndex === -1) {
    return false;
  }

  // 행 삭제 (0-indexed, +1 for header row)
  const deleteRowIndex = rowIndex + 1; // +1 because data starts at row 2

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: deleteRowIndex,
              endIndex: deleteRowIndex + 1,
            },
          },
        },
      ],
    },
  });

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
    phoneNumber: row[10] || undefined,
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
      exampleImages: [],
      deadline: row[16] || "", // 구 purchaseDeadline
    },
    {
      order: 2,
      title: "리뷰 인증하기",
      description: "제품을 개봉하여 사용/섭취한 사진이 포함된 포토리뷰를 캡처하여 인증해주세요.",
      exampleImages: [],
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
      const steps = JSON.parse(missionData[2]) as MissionStep[];
      // 구 형식 (exampleImage) → 새 형식 (exampleImages) 변환
      return steps.map((step) => {
        const oldExampleImage = (step as { exampleImage?: string }).exampleImage;
        return {
          ...step,
          exampleImages: step.exampleImages && step.exampleImages.length > 0
            ? step.exampleImages
            : oldExampleImage
              ? [oldExampleImage]
              : [],
        };
      });
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
      exampleImages: purchaseExampleImage ? [purchaseExampleImage] : [],
      deadline: purchaseDeadline,
    },
    {
      order: 2,
      title: "리뷰 인증하기",
      description: "제품을 개봉하여 사용/섭취한 사진이 포함된 포토리뷰를 캡처하여 인증해주세요.",
      exampleImages: reviewExampleImage ? [reviewExampleImage] : [],
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
