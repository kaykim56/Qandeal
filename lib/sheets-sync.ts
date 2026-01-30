import { google, sheets_v4 } from "googleapis";
import { createServiceRoleClient } from "./supabase";

// =====================================================
// Google Sheets 동기화 (Supabase → Google Sheets 단방향)
// =====================================================

const ADMIN_SHEET_ID = process.env.GOOGLE_ADMIN_SHEET_ID!;

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

// =====================================================
// 탭 자동 생성
// =====================================================

const TAB_NAMES = ["통합", "검수", "운영 대시보드"] as const;

async function ensureTabsExist(sheets: sheets_v4.Sheets): Promise<void> {
  // 현재 시트 정보 조회
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: ADMIN_SHEET_ID,
  });

  const existingTabs = new Set(
    spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
  );

  // 없는 탭 생성
  const tabsToCreate = TAB_NAMES.filter((name) => !existingTabs.has(name));

  if (tabsToCreate.length === 0) {
    console.log("[ensureTabsExist] All tabs already exist");
    return;
  }

  console.log(`[ensureTabsExist] Creating tabs: ${tabsToCreate.join(", ")}`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: ADMIN_SHEET_ID,
    requestBody: {
      requests: tabsToCreate.map((title) => ({
        addSheet: {
          properties: {
            title,
          },
        },
      })),
    },
  });

  console.log("[ensureTabsExist] Tabs created successfully");
}

// =====================================================
// 데이터 타입
// =====================================================

interface ParticipationData {
  participationId: string;
  qandaUserId: string;
  challengeShortId: string;
  challengeTitle: string;
  phoneNumber: string;
  createdAt: string;
  steps: Array<{
    stepOrder: number;
    stepName: string;
    completed: boolean;
    completedAt: string | null;
    imageUrl: string | null;
  }>;
}

// =====================================================
// Supabase에서 데이터 조회
// =====================================================

async function fetchSyncData(): Promise<ParticipationData[]> {
  const supabase = createServiceRoleClient();

  // participations + challenges + mission_steps + participation_images 조인 쿼리
  const { data: participations, error: participationsError } = await supabase
    .from("participations")
    .select(`
      id,
      qanda_user_id,
      phone_number,
      created_at,
      challenge_id,
      challenges!inner (
        id,
        short_id,
        title
      )
    `)
    .order("created_at", { ascending: false });

  if (participationsError) {
    console.error("Failed to fetch participations:", participationsError);
    throw participationsError;
  }

  // 모든 participation_images 조회
  const { data: allImages, error: imagesError } = await supabase
    .from("participation_images")
    .select("participation_id, step_order, image_url, uploaded_at");

  if (imagesError) {
    console.error("Failed to fetch participation_images:", imagesError);
    throw imagesError;
  }

  // 모든 mission_steps 조회
  const { data: allSteps, error: stepsError } = await supabase
    .from("mission_steps")
    .select("challenge_id, step_order, title")
    .order("step_order", { ascending: true });

  if (stepsError) {
    console.error("Failed to fetch mission_steps:", stepsError);
    throw stepsError;
  }

  // 이미지 맵 생성 (participation_id -> step_order -> image data)
  const imageMap = new Map<string, Map<number, { imageUrl: string; uploadedAt: string }>>();
  for (const img of allImages || []) {
    if (!img.participation_id) continue;
    if (!imageMap.has(img.participation_id)) {
      imageMap.set(img.participation_id, new Map());
    }
    imageMap.get(img.participation_id)!.set(img.step_order, {
      imageUrl: img.image_url,
      uploadedAt: img.uploaded_at,
    });
  }

  // 미션 스텝 맵 생성 (challenge_id -> step_order -> title)
  const stepMap = new Map<string, Map<number, string>>();
  for (const step of allSteps || []) {
    if (!step.challenge_id) continue;
    if (!stepMap.has(step.challenge_id)) {
      stepMap.set(step.challenge_id, new Map());
    }
    stepMap.get(step.challenge_id)!.set(step.step_order, step.title);
  }

  // 데이터 변환
  const result: ParticipationData[] = [];

  for (const p of participations || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const challenge = p.challenges as any;
    if (!challenge) continue;

    const challengeId = challenge.id;
    const participationImages = imageMap.get(p.id) || new Map();
    const challengeSteps = stepMap.get(challengeId) || new Map();

    // 스텝 1~4 데이터 생성
    const steps: ParticipationData["steps"] = [];
    for (let stepOrder = 1; stepOrder <= 4; stepOrder++) {
      const stepName = challengeSteps.get(stepOrder) || "";
      const imageData = participationImages.get(stepOrder);

      steps.push({
        stepOrder,
        stepName,
        completed: !!imageData,
        completedAt: imageData?.uploadedAt || null,
        imageUrl: imageData?.imageUrl || null,
      });
    }

    result.push({
      participationId: p.id,
      qandaUserId: p.qanda_user_id,
      challengeShortId: challenge.short_id || challenge.id.substring(0, 8),
      challengeTitle: challenge.title,
      phoneNumber: p.phone_number || "",
      createdAt: p.created_at,
      steps,
    });
  }

  return result;
}

// =====================================================
// 날짜 포맷 헬퍼
// =====================================================

function formatDateTime(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// =====================================================
// 시트 탭 동기화
// =====================================================

// 탭 1: "통합" (원본 데이터)
async function syncIntegrationTab(
  sheets: sheets_v4.Sheets,
  data: ParticipationData[]
): Promise<number> {
  const headers = [
    "참가Key",
    "콴다ID",
    "챌린지ID",
    "챌린지명",
    "전화번호",
    "참가일시",
    "스텝1_이름",
    "스텝1_완료",
    "스텝1_일시",
    "스텝1_이미지URL",
    "스텝2_이름",
    "스텝2_완료",
    "스텝2_일시",
    "스텝2_이미지URL",
    "스텝3_이름",
    "스텝3_완료",
    "스텝3_일시",
    "스텝3_이미지URL",
    "스텝4_이름",
    "스텝4_완료",
    "스텝4_일시",
    "스텝4_이미지URL",
  ];

  const rows = data.map((p) => {
    const row = [
      p.participationId,
      p.qandaUserId,
      p.challengeShortId,
      p.challengeTitle,
      p.phoneNumber,
      formatDateTime(p.createdAt),
    ];

    // 스텝 1~4 데이터 추가
    for (const step of p.steps) {
      row.push(step.stepName);
      row.push(step.completed ? "O" : "X");
      row.push(formatDateTime(step.completedAt));
      row.push(step.imageUrl || "");
    }

    return row;
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: ADMIN_SHEET_ID,
    range: "통합!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [headers, ...rows],
    },
  });

  return rows.length;
}

// 탭 2: "검수" (이미지 검수용)
async function syncReviewTab(
  sheets: sheets_v4.Sheets,
  data: ParticipationData[]
): Promise<number> {
  const headers = [
    "참가Key",
    "콴다ID",
    "챌린지명",
    "스텝1_이름",
    "스텝1_썸네일",
    "스텝1_원본보기",
    "스텝1_검수",
    "스텝1_반려사유",
    "스텝2_이름",
    "스텝2_썸네일",
    "스텝2_원본보기",
    "스텝2_검수",
    "스텝2_반려사유",
    "스텝3_이름",
    "스텝3_썸네일",
    "스텝3_원본보기",
    "스텝3_검수",
    "스텝3_반려사유",
    "스텝4_이름",
    "스텝4_썸네일",
    "스텝4_원본보기",
    "스텝4_검수",
    "스텝4_반려사유",
  ];

  // 기존 검수/반려사유 데이터 보존을 위해 현재 시트 데이터 읽기
  let existingReviewData = new Map<string, Record<string, string>>();
  try {
    const existingResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: ADMIN_SHEET_ID,
      range: "검수!A2:W",
    });

    const existingRows = existingResponse.data.values || [];
    for (const row of existingRows) {
      const participationId = row[0];
      if (!participationId) continue;

      existingReviewData.set(participationId, {
        step1_review: row[6] || "",
        step1_reason: row[7] || "",
        step2_review: row[11] || "",
        step2_reason: row[12] || "",
        step3_review: row[16] || "",
        step3_reason: row[17] || "",
        step4_review: row[21] || "",
        step4_reason: row[22] || "",
      });
    }
  } catch (error) {
    // 시트가 비어있거나 없는 경우 무시
    console.log("No existing review data found, starting fresh");
  }

  const rows = data.map((p) => {
    const existing = existingReviewData.get(p.participationId) || {};

    const row = [p.participationId, p.qandaUserId, p.challengeTitle];

    // 스텝 1~4 데이터 추가
    for (let i = 0; i < 4; i++) {
      const step = p.steps[i];
      const stepNum = i + 1;

      row.push(step.stepName);
      // 이미지가 있으면 IMAGE 수식, 없으면 빈 문자열
      row.push(step.imageUrl ? `=IMAGE("${step.imageUrl}")` : "");
      // 원본 보기 HYPERLINK
      row.push(step.imageUrl ? `=HYPERLINK("${step.imageUrl}", "원본 보기")` : "");
      // 기존 검수 상태 유지 (없으면 "대기")
      row.push(existing[`step${stepNum}_review`] || "대기");
      // 기존 반려사유 유지
      row.push(existing[`step${stepNum}_reason`] || "");
    }

    return row;
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: ADMIN_SHEET_ID,
    range: "검수!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [headers, ...rows],
    },
  });

  return rows.length;
}

// 탭 3: "운영 대시보드" (요약)
async function syncDashboardTab(
  sheets: sheets_v4.Sheets,
  data: ParticipationData[]
): Promise<number> {
  const headers = [
    "참가Key",
    "콴다ID",
    "챌린지명",
    "전화번호",
    "참가일시",
    "스텝1_상태",
    "스텝2_상태",
    "스텝3_상태",
    "스텝4_상태",
    "전체진행률",
  ];

  const rows = data.map((p) => {
    // 각 챌린지의 실제 스텝 수 계산 (이름이 있는 스텝만)
    const totalSteps = p.steps.filter((s) => s.stepName).length;
    const completedSteps = p.steps.filter((s) => s.stepName && s.completed).length;
    const progressRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    const row = [
      p.participationId,
      p.qandaUserId,
      p.challengeTitle,
      p.phoneNumber,
      formatDateTime(p.createdAt),
    ];

    // 스텝 1~4 상태 추가 (스텝이 없으면 "-", 있으면 "완료"/"미완료")
    for (const step of p.steps) {
      if (!step.stepName) {
        row.push("-");
      } else {
        row.push(step.completed ? "완료" : "미완료");
      }
    }

    row.push(`${progressRate}%`);

    return row;
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: ADMIN_SHEET_ID,
    range: "운영 대시보드!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [headers, ...rows],
    },
  });

  return rows.length;
}

// =====================================================
// 메인 동기화 함수
// =====================================================

export interface SyncResult {
  success: boolean;
  syncedRows: number;
  tabs: {
    integration: number;
    review: number;
    dashboard: number;
  };
  timestamp: string;
  error?: string;
}

export async function syncToSheets(): Promise<SyncResult> {
  const timestamp = new Date().toISOString();

  try {
    // 1. Supabase에서 데이터 조회
    const data = await fetchSyncData();
    console.log(`[syncToSheets] Fetched ${data.length} participations`);

    // 2. Google Sheets 클라이언트 생성
    const sheets = getSheets();

    // 3. 필요한 탭 생성 (없으면)
    await ensureTabsExist(sheets);

    // 4. 각 탭에 데이터 쓰기
    const integrationCount = await syncIntegrationTab(sheets, data);
    const reviewCount = await syncReviewTab(sheets, data);
    const dashboardCount = await syncDashboardTab(sheets, data);

    console.log(`[syncToSheets] Synced - 통합: ${integrationCount}, 검수: ${reviewCount}, 대시보드: ${dashboardCount}`);

    return {
      success: true,
      syncedRows: data.length,
      tabs: {
        integration: integrationCount,
        review: reviewCount,
        dashboard: dashboardCount,
      },
      timestamp,
    };
  } catch (error) {
    console.error("[syncToSheets] Error:", error);
    return {
      success: false,
      syncedRows: 0,
      tabs: {
        integration: 0,
        review: 0,
        dashboard: 0,
      },
      timestamp,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
