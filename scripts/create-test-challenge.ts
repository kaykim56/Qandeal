/**
 * 테스트용 챌린지 생성 스크립트
 * 기존 챌린지를 복제하고 deadline을 오늘로 설정
 *
 * Usage: npx tsx scripts/create-test-challenge.ts [원본챌린지ID]
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

async function listChallenges() {
  const { data, error } = await supabase
    .from("challenges")
    .select("id, title, status, purchase_deadline, review_deadline")
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching challenges:", error);
    return [];
  }

  return data || [];
}

async function cloneChallenge(sourceId: string) {
  // 1. 원본 챌린지 조회
  const { data: source, error: fetchError } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", sourceId)
    .single();

  if (fetchError || !source) {
    console.error("Source challenge not found:", fetchError);
    return null;
  }

  // 2. 오늘 날짜 계산 (KST)
  const today = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(today.getTime() + kstOffset);
  const todayStr = kstDate.toISOString().split("T")[0]; // "2026-02-03"

  // 리뷰 deadline은 오늘+3일
  const reviewDate = new Date(kstDate.getTime() + 3 * 24 * 60 * 60 * 1000);
  const reviewStr = reviewDate.toISOString().split("T")[0];

  // 3. 새 챌린지 생성
  const { data: newChallenge, error: createError } = await supabase
    .from("challenges")
    .insert({
      platform: source.platform,
      title: `[QA테스트] ${source.title}`,
      option: source.option,
      original_price: source.original_price,
      payback_rate: source.payback_rate,
      payback_amount: source.payback_amount,
      final_price: source.final_price,
      product_image: source.product_image,
      product_link: source.product_link,
      detail_images: source.detail_images,
      status: "published", // 바로 테스트 가능하도록
      created_by: "QA_TEST",
      purchase_deadline: todayStr,
      review_deadline: reviewStr,
    })
    .select()
    .single();

  if (createError || !newChallenge) {
    console.error("Failed to create challenge:", createError);
    return null;
  }

  // 4. Mission steps 복제
  const { data: sourceSteps } = await supabase
    .from("mission_steps")
    .select("*")
    .eq("challenge_id", sourceId)
    .order("step_order");

  if (sourceSteps && sourceSteps.length > 0) {
    const newSteps = sourceSteps.map((step, idx) => ({
      challenge_id: newChallenge.id,
      step_order: step.step_order,
      title: step.title,
      description: step.description,
      example_images: step.example_images,
      // 첫 번째 스텝(구매)은 오늘, 나머지는 리뷰 deadline
      deadline: idx === 0 ? todayStr : reviewStr,
    }));

    const { error: stepsError } = await supabase
      .from("mission_steps")
      .insert(newSteps);

    if (stepsError) {
      console.error("Failed to create mission steps:", stepsError);
    }
  }

  return newChallenge;
}

async function main() {
  const sourceId = process.argv[2];

  if (!sourceId) {
    console.log("\n📋 현재 챌린지 목록:\n");
    const challenges = await listChallenges();

    challenges.forEach((c, i) => {
      console.log(`${i + 1}. [${c.status}] ${c.title}`);
      console.log(`   ID: ${c.id}`);
      console.log(`   구매 기한: ${c.purchase_deadline}, 리뷰 기한: ${c.review_deadline}\n`);
    });

    console.log("\n사용법: npx tsx scripts/create-test-challenge.ts [챌린지ID]");
    console.log("예: npx tsx scripts/create-test-challenge.ts abc123-def456-...\n");
    return;
  }

  console.log(`\n🔄 챌린지 복제 중... (원본: ${sourceId})`);

  const newChallenge = await cloneChallenge(sourceId);

  if (newChallenge) {
    console.log("\n✅ 테스트 챌린지 생성 완료!");
    console.log(`   ID: ${newChallenge.id}`);
    console.log(`   제목: ${newChallenge.title}`);
    console.log(`   구매 기한: ${newChallenge.purchase_deadline} (오늘)`);
    console.log(`   리뷰 기한: ${newChallenge.review_deadline}`);
    console.log(`\n🔗 URL: http://localhost:3000/challenge/${newChallenge.id}`);
    console.log(`🔗 Prod: https://deuktem.qanda.ai/challenge/${newChallenge.id}\n`);
  }
}

main().catch(console.error);
