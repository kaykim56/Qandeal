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

async function fixParticipation() {
  const participationId = "5797a7ed-bc80-4354-a525-5a4779bd0081";
  const normalizedPhone = "01035203590"; // 하이픈 제거된 번호

  const { data, error } = await supabase
    .from("participations")
    .update({ phone_number: normalizedPhone })
    .eq("id", participationId)
    .select()
    .single();

  if (error) {
    console.log("Error:", error);
  } else {
    console.log("✅ 전화번호 수정 완료!");
    console.log("Phone (normalized):", data.phone_number);
  }
}

fixParticipation();
