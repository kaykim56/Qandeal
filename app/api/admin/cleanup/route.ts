import { NextResponse } from "next/server";
import { google } from "googleapis";

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

// GET /api/admin/cleanup - 중복/문제 데이터 진단
export async function GET() {
  try {
    const sheets = getSheets();

    // 챌린지 데이터 가져오기
    const challengesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "challenges!A2:R",
    });
    const challengeRows = challengesRes.data.values || [];

    // 참여 데이터 가져오기
    const participationsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "participations!A2:J",
    });
    const participationRows = participationsRes.data.values || [];

    // missions 데이터 가져오기
    const missionsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "missions!A2:D",
    });
    const missionRows = missionsRes.data.values || [];

    // 상태별 개수 세기 (정확한 값 확인)
    const statusCounts: Record<string, number> = {};
    challengeRows.forEach((r) => {
      const status = r[12] || "(empty)";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // 진단 결과
    const diagnosis = {
      challenges: {
        total: challengeRows.length,
        statusBreakdown: statusCounts,
        published: challengeRows.filter((r) => r[12] === "published").length,
        draft: challengeRows.filter((r) => r[12] === "draft").length,
        deleted: challengeRows.filter((r) => r[12] === "deleted").length,
        noId: challengeRows.filter((r) => !r[0]).length,
        duplicateIds: [] as string[],
        // 모든 챌린지 요약 (ID, 제목, 상태)
        list: challengeRows.map((r) => ({
          id: r[0],
          title: r[2]?.substring(0, 30) || "(no title)",
          status: r[12] || "(empty)",
        })),
      },
      participations: {
        total: participationRows.length,
        pending: participationRows.filter((r) => r[5] === "pending").length,
        approved: participationRows.filter((r) => r[5] === "approved").length,
        rejected: participationRows.filter((r) => r[5] === "rejected").length,
        noId: participationRows.filter((r) => !r[0]).length,
        duplicates: [] as { challengeId: string; userId: string; count: number }[],
        // 참여 목록 (userId, challengeId, status, testerEmail)
        list: participationRows.map((r) => ({
          id: r[0],
          challengeId: r[1],
          userId: r[2]?.substring(0, 20) || "(no userId)",
          status: r[5] || "(empty)",
          testerEmail: r[9] || "",
        })),
      },
      missions: {
        total: missionRows.length,
        // 새 형식 (stepsJson) vs 구 형식 구분
        newFormat: missionRows.filter((r) => r[2]?.startsWith("[")).length,
        oldFormat: missionRows.filter((r) => r[2] && !r[2].startsWith("[")).length,
        empty: missionRows.filter((r) => !r[2]).length,
        // 연결된 챌린지가 없는 미션
        orphaned: [] as string[],
        // 미션 목록
        list: missionRows.map((r) => ({
          id: r[0],
          challengeId: r[1],
          format: r[2]?.startsWith("[") ? "new (stepsJson)" : r[2] ? "old (exampleImages)" : "empty",
          preview: r[2]?.substring(0, 50) || "(empty)",
        })),
      },
    };

    // 중복 챌린지 ID 찾기
    const challengeIds = challengeRows.map((r) => r[0]).filter(Boolean);
    const challengeIdCounts: Record<string, number> = {};
    challengeIds.forEach((id) => {
      challengeIdCounts[id] = (challengeIdCounts[id] || 0) + 1;
    });
    diagnosis.challenges.duplicateIds = Object.entries(challengeIdCounts)
      .filter(([, count]) => count > 1)
      .map(([id]) => id);

    // 중복 참여 찾기 (같은 userId + challengeId)
    const participationKeys: Record<string, number> = {};
    participationRows.forEach((r) => {
      const key = `${r[1]}|${r[2]}`; // challengeId|userId
      participationKeys[key] = (participationKeys[key] || 0) + 1;
    });
    diagnosis.participations.duplicates = Object.entries(participationKeys)
      .filter(([, count]) => count > 1)
      .map(([key, count]) => {
        const [challengeId, userId] = key.split("|");
        return { challengeId, userId, count };
      });

    // orphaned missions 찾기 (챌린지가 없는 미션)
    const validChallengeIds = new Set(challengeIds);
    diagnosis.missions.orphaned = missionRows
      .filter((r) => r[1] && !validChallengeIds.has(r[1]))
      .map((r) => r[1]);

    return NextResponse.json({
      success: true,
      diagnosis,
      message: "진단 완료. POST 요청으로 정리를 실행할 수 있습니다.",
    });
  } catch (error) {
    console.error("Cleanup diagnosis error:", error);
    return NextResponse.json(
      { error: "진단 중 오류 발생", details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/admin/cleanup - 중복 데이터 정리
export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    const sheets = getSheets();

    if (action === "remove-deleted-challenges") {
      // deleted 상태인 챌린지 행 삭제
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "challenges!A2:R",
      });
      const rows = res.data.values || [];

      // 삭제할 행 인덱스 (역순으로 삭제해야 인덱스가 안 꼬임)
      const deletedIndices = rows
        .map((r, i) => (r[12] === "deleted" ? i : -1))
        .filter((i) => i !== -1)
        .reverse();

      if (deletedIndices.length === 0) {
        return NextResponse.json({ success: true, message: "삭제할 항목이 없습니다" });
      }

      // 삭제된 것 제외한 데이터로 덮어쓰기
      const remainingRows = rows.filter((r) => r[12] !== "deleted");

      // 먼저 전체 범위 클리어
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: "challenges!A2:R",
      });

      // 남은 데이터 다시 쓰기
      if (remainingRows.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: "challenges!A2:R",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: remainingRows },
        });
      }

      return NextResponse.json({
        success: true,
        message: `${deletedIndices.length}개의 삭제된 챌린지를 정리했습니다`,
      });
    }

    if (action === "remove-unpublished-challenges") {
      // published가 아닌 챌린지 모두 삭제 (draft, empty, etc.)
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "challenges!A2:R",
      });
      const rows = res.data.values || [];

      const publishedRows = rows.filter((r) => r[12] === "published");
      const removedCount = rows.length - publishedRows.length;

      if (removedCount === 0) {
        return NextResponse.json({ success: true, message: "삭제할 항목이 없습니다" });
      }

      // 클리어 후 다시 쓰기
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: "challenges!A2:R",
      });

      if (publishedRows.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: "challenges!A2:R",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: publishedRows },
        });
      }

      return NextResponse.json({
        success: true,
        message: `${removedCount}개의 미게시 챌린지를 정리했습니다 (게시된 ${publishedRows.length}개 유지)`,
      });
    }

    if (action === "remove-duplicate-participations") {
      // 중복 참여 정리 (같은 challengeId+userId 중 가장 최신 것만 유지)
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "participations!A2:I",
      });
      const rows = res.data.values || [];

      // key별로 그룹화하고 가장 최신(또는 이미지가 있는) 것만 유지
      const grouped: Record<string, string[][]> = {};
      rows.forEach((r) => {
        const key = `${r[1]}|${r[2]}`; // challengeId|userId
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
      });

      const uniqueRows: string[][] = [];
      Object.values(grouped).forEach((group) => {
        if (group.length === 1) {
          uniqueRows.push(group[0]);
        } else {
          // 이미지가 있거나 승인된 것 우선, 없으면 가장 최신
          const sorted = group.sort((a, b) => {
            // approved 상태 우선
            if (a[5] === "approved" && b[5] !== "approved") return -1;
            if (b[5] === "approved" && a[5] !== "approved") return 1;
            // 이미지 있는 것 우선
            const aHasImage = !!(a[3] || a[4]);
            const bHasImage = !!(b[3] || b[4]);
            if (aHasImage && !bHasImage) return -1;
            if (bHasImage && !aHasImage) return 1;
            // 최신순
            return (b[6] || "").localeCompare(a[6] || "");
          });
          uniqueRows.push(sorted[0]);
        }
      });

      const removedCount = rows.length - uniqueRows.length;

      if (removedCount === 0) {
        return NextResponse.json({ success: true, message: "중복 항목이 없습니다" });
      }

      // 클리어 후 다시 쓰기
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: "participations!A2:I",
      });

      if (uniqueRows.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: "participations!A2:I",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: uniqueRows },
        });
      }

      return NextResponse.json({
        success: true,
        message: `${removedCount}개의 중복 참여를 정리했습니다`,
      });
    }

    if (action === "clear-all-participations") {
      // 모든 참여 기록 삭제 (테스트 데이터 정리용)
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "participations!A2:J",
      });
      const rows = res.data.values || [];
      const count = rows.length;

      if (count === 0) {
        return NextResponse.json({ success: true, message: "삭제할 참여 기록이 없습니다" });
      }

      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: "participations!A2:J",
      });

      return NextResponse.json({
        success: true,
        message: `${count}개의 참여 기록을 모두 삭제했습니다`,
      });
    }

    if (action === "clear-orphaned-missions") {
      // 챌린지가 없는 미션 삭제
      const challengesRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "challenges!A2:A",
      });
      const challengeIds = new Set((challengesRes.data.values || []).map((r) => r[0]).filter(Boolean));

      const missionsRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "missions!A2:D",
      });
      const missionRows = missionsRes.data.values || [];

      const validMissions = missionRows.filter((r) => challengeIds.has(r[1]));
      const removedCount = missionRows.length - validMissions.length;

      if (removedCount === 0) {
        return NextResponse.json({ success: true, message: "정리할 미션이 없습니다" });
      }

      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: "missions!A2:D",
      });

      if (validMissions.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: "missions!A2:D",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: validMissions },
        });
      }

      return NextResponse.json({
        success: true,
        message: `${removedCount}개의 고아 미션을 삭제했습니다 (유효한 ${validMissions.length}개 유지)`,
      });
    }

    if (action === "clear-all-missions") {
      // 모든 미션 삭제 (재생성 전 초기화용)
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "missions!A2:D",
      });
      const count = (res.data.values || []).length;

      if (count === 0) {
        return NextResponse.json({ success: true, message: "삭제할 미션이 없습니다" });
      }

      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: "missions!A2:D",
      });

      return NextResponse.json({
        success: true,
        message: `${count}개의 미션을 모두 삭제했습니다`,
      });
    }

    return NextResponse.json(
      {
        error: "유효하지 않은 action입니다",
        availableActions: [
          "remove-deleted-challenges",
          "remove-unpublished-challenges",
          "remove-duplicate-participations",
          "clear-all-participations",
          "clear-orphaned-missions",
          "clear-all-missions"
        ]
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "정리 중 오류 발생", details: String(error) },
      { status: 500 }
    );
  }
}
