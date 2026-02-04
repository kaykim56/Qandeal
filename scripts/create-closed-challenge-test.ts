/**
 * 참가 마감 테스트용 챌린지 생성 스크립트
 * - deadline이 어제인 챌린지 생성
 * - 지정된 전화번호로 참여 기록 추가
 *
 * Usage: npx tsx scripts/create-closed-challenge-test.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// .env.production 파일 수동 파싱
const envPath = path.join(process.cwd(), ".env.production");
const envContent = fs.readFileSync(envPath, "utf-8");
const envLines = envContent.split("\n");

for (const line of envLines) {
  if (line.startsWith("#") || !line.includes("=")) continue;
  const [key, ...valueParts] = line.split("=");
  let value = valueParts.join("=").replace(/^["']|["']$/g, "");
  value = value.replace(/\\n/g, "");
  process.env[key.trim()] = value.trim();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  // 어제 날짜 계산 (KST)
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);

  // 어제
  const yesterday = new Date(kstNow.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // 리뷰는 어제+3일 (= 모레)
  const reviewDate = new Date(yesterday.getTime() + 3 * 24 * 60 * 60 * 1000);
  const reviewStr = reviewDate.toISOString().split("T")[0];

  console.log(`\n📅 날짜 정보:`);
  console.log(`   구매 기한 (어제): ${yesterdayStr}`);
  console.log(`   리뷰 기한: ${reviewStr}`);

  // 1. 테스트 챌린지 생성
  console.log(`\n🔄 마감 테스트용 챌린지 생성 중...`);

  const { data: newChallenge, error: createError } = await supabase
    .from("challenges")
    .insert({
      platform: "네이버 스마트스토어",
      title: "[마감테스트] 참가 마감 기능 테스트용",
      option: "테스트 옵션",
      original_price: 10000,
      payback_rate: 50,
      payback_amount: 5000,
      final_price: 5000,
      product_image: null,
      product_link: "https://example.com",
      detail_images: [],
      status: "published",
      created_by: "QA_TEST",
      purchase_deadline: yesterdayStr,
      review_deadline: reviewStr,
    })
    .select()
    .single();

  if (createError || !newChallenge) {
    console.error("Failed to create challenge:", createError);
    return;
  }

  console.log(`✅ 챌린지 생성 완료: ${newChallenge.id}`);

  // 2. Mission steps 생성
  const { error: stepsError } = await supabase
    .from("mission_steps")
    .insert([
      {
        challenge_id: newChallenge.id,
        step_order: 1,
        title: "구매 인증하기",
        description: "테스트용 구매 인증 설명",
        example_images: [],
        deadline: yesterdayStr,
      },
      {
        challenge_id: newChallenge.id,
        step_order: 2,
        title: "리뷰 인증하기",
        description: "테스트용 리뷰 인증 설명",
        example_images: [],
        deadline: reviewStr,
      },
    ]);

  if (stepsError) {
    console.error("Failed to create mission steps:", stepsError);
  } else {
    console.log(`✅ Mission steps 생성 완료`);
  }

  // 3. 참여 기록 추가 (전화번호: 010-3520-3590)
  const phoneNumber = "01035203590";
  const userId = `phone_${phoneNumber}`;

  const { data: participation, error: partError } = await supabase
    .from("participations")
    .insert({
      challenge_id: newChallenge.id,
      qanda_user_id: userId,
      phone_number: phoneNumber,
      status: "pending",
    })
    .select()
    .single();

  if (partError) {
    console.error("Failed to create participation:", partError);
  } else {
    console.log(`✅ 참여 기록 생성 완료: ${participation.id}`);
    console.log(`   전화번호: 010-3520-3590`);
  }

  // 결과 출력
  console.log(`\n========================================`);
  console.log(`🎯 테스트 챌린지 정보`);
  console.log(`========================================`);
  console.log(`챌린지 ID: ${newChallenge.id}`);
  console.log(`제목: ${newChallenge.title}`);
  console.log(`구매 기한: ${yesterdayStr} (어제 - 마감됨)`);
  console.log(`리뷰 기한: ${reviewStr}`);
  console.log(`\n🔗 URL:`);
  console.log(`   Local: http://localhost:3000/challenge/${newChallenge.id}`);
  console.log(`   Prod:  https://deuktem.qanda.ai/challenge/${newChallenge.id}`);
  console.log(`\n📱 참여 정보:`);
  console.log(`   전화번호: 010-3520-3590`);
  console.log(`   → 이 번호로 전화번호 인증하면 참여 상태로 진입 가능`);
  console.log(`   → "참가 마감" 버튼이 표시되어야 함\n`);
}

main().catch(console.error);
