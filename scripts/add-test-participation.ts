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

async function addParticipation() {
  const challengeId = "98b61ccb-eaf5-4f2f-b158-1e55a144fc97";
  const phoneNumber = "010-3520-3590";

  const { data, error } = await supabase
    .from("participations")
    .insert({
      challenge_id: challengeId,
      phone_number: phoneNumber,
      qanda_user_id: "dummy",
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.log("Error:", error);
  } else {
    console.log("✅ 참여 데이터 추가 완료!");
    console.log("Participation ID:", data.id);
    console.log("Challenge ID:", data.challenge_id);
    console.log("Phone:", data.phone_number);
    console.log("Status:", data.status);
  }
}

addParticipation();
