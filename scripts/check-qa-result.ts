import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env.production");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  if (line.startsWith("#") || !line.includes("=")) continue;
  const [key, ...valueParts] = line.split("=");
  let value = valueParts.join("=").replace(/^["']|["']$/g, "");
  value = value.replace(/\\n/g, "");
  process.env[key.trim()] = value.trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function check() {
  const challengeId = "98b61ccb-eaf5-4f2f-b158-1e55a144fc97";
  const participationId = "5797a7ed-bc80-4354-a525-5a4779bd0081";

  // 1. 챌린지 정보 확인
  const { data: challenge } = await supabase
    .from("challenges")
    .select("title, purchase_deadline, review_deadline")
    .eq("id", challengeId)
    .single();

  console.log("📋 챌린지 정보:");
  console.log("  제목:", challenge?.title);
  console.log("  구매 기한:", challenge?.purchase_deadline);
  console.log("  리뷰 기한:", challenge?.review_deadline);

  // 2. 미션 스텝 확인
  const { data: steps } = await supabase
    .from("mission_steps")
    .select("step_order, title, deadline")
    .eq("challenge_id", challengeId)
    .order("step_order");

  console.log("\n📝 미션 스텝:");
  steps?.forEach((s) => {
    console.log(`  Step ${s.step_order}: ${s.title} (deadline: ${s.deadline})`);
  });

  // 3. 참여 이미지 확인
  const { data: images } = await supabase
    .from("participation_images")
    .select("*")
    .eq("participation_id", participationId);

  console.log("\n🖼️ 업로드된 이미지:");
  if (images && images.length > 0) {
    images.forEach((img) => {
      console.log(`Step ${img.step_order}, Order ${img.image_order}:`);
      console.log(img.image_url);
      console.log("");
    });
  } else {
    console.log("  (없음)");
  }
}

check();
