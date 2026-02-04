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

async function deleteTestData() {
  const challengeId = "98b61ccb-eaf5-4f2f-b158-1e55a144fc97";
  const participationId = "5797a7ed-bc80-4354-a525-5a4779bd0081";

  // 1. participation_images 삭제
  const { error: imgError } = await supabase
    .from("participation_images")
    .delete()
    .eq("participation_id", participationId);

  if (imgError) console.log("Error deleting images:", imgError);
  else console.log("✅ participation_images 삭제 완료");

  // 2. participations 삭제
  const { error: partError } = await supabase
    .from("participations")
    .delete()
    .eq("id", participationId);

  if (partError) console.log("Error deleting participation:", partError);
  else console.log("✅ participations 삭제 완료");

  // 3. mission_steps 삭제
  const { error: stepsError } = await supabase
    .from("mission_steps")
    .delete()
    .eq("challenge_id", challengeId);

  if (stepsError) console.log("Error deleting mission_steps:", stepsError);
  else console.log("✅ mission_steps 삭제 완료");

  // 4. challenges 삭제
  const { error: challengeError } = await supabase
    .from("challenges")
    .delete()
    .eq("id", challengeId);

  if (challengeError) console.log("Error deleting challenge:", challengeError);
  else console.log("✅ challenge 삭제 완료");

  console.log("\n🗑️ 테스트 데이터 삭제 완료!");
}

deleteTestData();
