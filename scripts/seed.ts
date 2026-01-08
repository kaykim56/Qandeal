// 테스트 데이터 시드 스크립트
// 실행: npx tsx scripts/seed.ts

import { google } from "googleapis";

const SHEET_ID = "1O6yvB4qwNVARANz6JRBlThT0X5VY9UKpR4BblIo8_dk";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: "qanda-ad@qanda-ad.iam.gserviceaccount.com",
    private_key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC5J98ybsOJ6I1g
1atR9ySMe05pl7odAeTo9HX0QT0OgLLt724gc7xg3a3ggMF0AInaVO3sxJH9YGbX
n8QsTxkQHsfKdSNbZ0PU92+NdS+8Buw+1nLWd2FBnNF0j0skQ+ZkUFK2G4g70Rub
j11iB7gjNqxpOX4wDJ1onxLKiDIY8AD8gGidZF5uXOrjBkYigg5sVcTaRJU+s4nt
HFDbxsmZd7nTtLf/N/6zQbehEXARsqiRVPxZOxsYcNhxyJvf0KSiwBB0HKk/59qJ
Yr39TLSLlaO12TqPiY1Wfqz1WYslaGETA/EaFORaSKUVAEhrr2czGjuFABVEXbnj
dJuuasGLAgMBAAECggEAJ9TKgKxwV1IWW+8LUHI0xB3go/mWeZgHORAh8d449s47
79CypbuQGlyGA8ZfF4foH/ZmSqmM6G+dICTIDGolr6CXhVfGt+qSnpVuQ4Wis7Xf
i7MReE6tNvK34nXTCeWrggf/ixqIJ6oX4NKqGaUkeTrRQz+xhD+qey/BWJ2M/W0B
4lSdCZ9pECoq3zNpeRe7c56y4SbfZgpuobBcWoHyaPwNBjFNToLplcWfwVwqu0lh
3gA/+xEAphCtSxM+a9/+pvCm823U9MhXbAp32fhtYF1AwlyVyILXZbd2jvfP+Yol
O0vCwgx3pecBfcdhKOFy3rusB64w2OHKwRazfaBl7QKBgQDzLgUlL9lRf+Graqk5
kBYYQ6RUqkDYt7RURvHIIf+s2owehYCAEC8tn9mhBfBxKz1AM2KRUDyBBpL6lOSC
4T4SkR11zHsQgDkLt4/kzfjlynw0VyiD9lp+w6cDXePIiLXh577MQzwXXxIBFtVp
5ZBV896TvYnAaunoUyEUxweqrwKBgQDC6sDkecOw3o1++uMGQxFVmZHAqpXX8ope
eZ2gprTbH8jhIKPFnVZ5/vdMtTkpi4fTffK+ysR7vqk2DS5yCfWH7ckscY+PDzWU
5dqV63mf1oFXeyM2+TEXn9GetQqqZF576SXkoIhGkcIfdjidrVcwZxtt50C4NV2Q
RRlBsqrd5QKBgQDYPbL7l2ny6/mbeXRTqInNN9EYLHEPhYPIcXGs2nbFmW2B8osK
1dluA7f9VQ+zQpTr0wWyXBwBS/xE8UOmEm8lCX+d8Z/5U1vmzGsbNgE/LWh3Do4L
knR0Rrzr5ICaIN9Dq9ThRGRaEAMtjsVlrmpD1GC3FZM51Jh9K/a9yCJMJwKBgDAM
5xhr3A4SDxeqiaTVi8RqYz/3zZC6vdmkaXNdJWCPaVn2Tek9bEAO1rAWTM0tFILS
nbDjE6Tdz6D/ht+eDOVBfUJzjExcF31pXIVw0z7QBnqmZHv82llUkLxrLQHsVE5/
n1PJL08WR6Cx6CsWvFO2V1C0nYPLxBD4t802WmDxAoGAaOM29eeOKtnnTqObo2iK
kJCalltl/dPJS7Kptnarkrg4n/oJ+UoOpkJ5MgMBN7Ie7RJJPu09FemA776bND2B
VLg0B3JqFFb4ziVwm2FLwn0JjSb+AKZnsWGlAibQEeRGPV940x9RRJ30G0zRS9EI
lif9L+tncN3fvcQ4XqrdNLs=
-----END PRIVATE KEY-----`,
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

async function seed() {
  const now = new Date().toISOString();

  // 1. challenges 시트 헤더 + 더미 데이터
  const challengeData = [
    ["id", "platform", "title", "option", "purchaseTimeLimit", "originalPrice", "paybackRate", "paybackAmount", "finalPrice", "productImage", "productLink", "status", "createdAt", "updatedAt"],
    ["test-1", "카카오 선물하기", "수플린 달콤한 설향 딸기 800g", "특품(24~30입) *1개", "1/15 하루 동안", "30000", "40", "12000", "18000", "", "https://gift.kakao.com/product/123", "published", now, now],
    ["test-2", "올리브영", "닥터지 레드 블레미쉬 클리어 수딩 크림", "70ml", "1/20까지", "25000", "50", "12500", "12500", "", "https://oliveyoung.co.kr/product/456", "published", now, now],
    ["test-3", "쿠팡", "곰곰 무항생제 신선한 대란", "30구 *2팩", "1/18 하루 동안", "15000", "60", "9000", "6000", "", "https://coupang.com/product/789", "draft", now, now],
  ];

  // 2. missions 시트 헤더 + 더미 데이터
  const missionData = [
    ["id", "challengeId", "purchaseExampleImage", "reviewExampleImage"],
    ["m-1", "test-1", "", ""],
    ["m-2", "test-2", "", ""],
    ["m-3", "test-3", "", ""],
  ];

  try {
    // challenges 시트 데이터 삽입
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: "challenges!A1:N4",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: challengeData },
    });
    console.log("✅ challenges 데이터 삽입 완료");

    // missions 시트 데이터 삽입
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: "missions!A1:D4",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: missionData },
    });
    console.log("✅ missions 데이터 삽입 완료");

    console.log("\n🎉 시드 완료! http://localhost:3000/admin 에서 확인하세요.");
  } catch (error) {
    console.error("❌ 에러:", error);
  }
}

seed();
