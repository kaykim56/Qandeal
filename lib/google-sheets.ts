import { google } from "googleapis";
import { Challenge, ChallengeInput, ChallengeWithMissions, Mission } from "./types";

// Google Sheets 인증
function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
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
    range: "challenges!A2:P",
  });

  const rows = response.data.values || [];
  return rows.map(rowToChallenge);
}

export async function getChallengeById(id: string): Promise<ChallengeWithMissions | null> {
  const sheets = getSheets();

  // 챌린지 데이터 가져오기
  const challengeResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "challenges!A2:P",
  });

  const rows = challengeResponse.data.values || [];
  const row = rows.find((r) => r[0] === id);
  if (!row) return null;

  const challenge = rowToChallenge(row);

  // 미션은 기본 템플릿 사용 (예시 이미지만 Sheets에서 가져옴)
  const missionsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "missions!A2:G",
  });

  const missionRows = missionsResponse.data.values || [];
  const missionData = missionRows.find((r) => r[1] === id);

  const missions = getDefaultMissions(id, missionData);

  return { ...challenge, missions };
}

export async function createChallenge(input: ChallengeInput, createdBy?: string): Promise<string> {
  const sheets = getSheets();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const row = [
    id,
    input.platform,
    input.title,
    input.option,
    input.purchaseTimeLimit,
    input.originalPrice,
    input.paybackRate,
    input.paybackAmount,
    input.finalPrice,
    input.productImage,
    input.productLink,
    input.detailImage || "",
    input.status,
    now,
    now,
    createdBy || "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "challenges!A:P",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  // 미션 기본 데이터 생성 (예시 이미지 빈 값)
  const missionRow = [
    crypto.randomUUID(),
    id,
    "", // 구매 인증 예시 이미지
    "", // 리뷰 인증 예시 이미지
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "missions!A:D",
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
    range: "challenges!A2:P",
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) return false;

  const existing = rowToChallenge(rows[rowIndex]);
  const updated = { ...existing, ...input, updatedAt: new Date().toISOString() };

  const row = [
    updated.id,
    updated.platform,
    updated.title,
    updated.option,
    updated.purchaseTimeLimit,
    updated.originalPrice,
    updated.paybackRate,
    updated.paybackAmount,
    updated.finalPrice,
    updated.productImage,
    updated.productLink,
    updated.detailImage || "",
    updated.status,
    updated.createdAt,
    updated.updatedAt,
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `challenges!A${rowIndex + 2}:O${rowIndex + 2}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  return true;
}

export async function deleteChallenge(id: string): Promise<boolean> {
  const sheets = getSheets();

  // 챌린지 행 찾기
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "challenges!A2:P",
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

// 미션 예시 이미지 업데이트
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

// ============================================
// 헬퍼 함수
// ============================================

function rowToChallenge(row: string[]): Challenge {
  return {
    id: row[0] || "",
    platform: row[1] || "",
    title: row[2] || "",
    option: row[3] || "",
    purchaseTimeLimit: row[4] || "",
    originalPrice: Number(row[5]) || 0,
    paybackRate: Number(row[6]) || 0,
    paybackAmount: Number(row[7]) || 0,
    finalPrice: Number(row[8]) || 0,
    productImage: row[9] || "",
    productLink: row[10] || "",
    detailImage: row[11] || "",
    status: (row[12] as "draft" | "published") || "draft",
    createdAt: row[13] || "",
    updatedAt: row[14] || "",
    createdBy: row[15] || "",
  };
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
        "제품을 '나에게 선물하기'로 구매해주세요.",
        "🚨 판매가가 다를 경우 구매 페이지의 가격은 구매 당일에 변경돼요.",
        "[선물하기] > 주문내역 > 상세보기]로 이동해주세요.",
        "주문일, 주문번호, 주문상품이 보이도록 주문 상세정보를 캡처해주세요.",
        "캡처한 스크린샷을 앱에 인증해주세요.",
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
        "제품을 개봉하여 사용/섭취한 사진이 포함된 포토리뷰를 작성해주세요.",
        "[선물함 > 선물 후기 > 작성한 후기]로 이동해주세요.",
        "해당 제품 리뷰를 캡처하여 앱에 인증해주세요.",
      ],
      note: null,
      exampleImage: reviewExampleImage || null,
    },
  ];
}
