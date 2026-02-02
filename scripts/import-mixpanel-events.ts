import { createClient } from "@supabase/supabase-js";
import Mixpanel from "mixpanel";
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
  // 리터럴 \n 문자 제거
  value = value.replace(/\\n/g, "");
  process.env[key.trim()] = value.trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const mixpanel = Mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN!, {
  protocol: "https",
  secret: process.env.MIXPANEL_API_SECRET,
});

const COMMON_PROPERTIES = {
  service: "qanda-ad-challenge",
};

async function importPhoneVerifyEvents() {
  console.log("=== Mixpanel Import: phone_verify_success ===\n");

  // phone_number가 있는 참여 데이터 조회 (인증 완료된 것)
  const { data: participations, error } = await supabase
    .from("participations")
    .select("id, phone_number, created_at, challenge_id, challenges(title)")
    .not("phone_number", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching participations:", error);
    return;
  }

  console.log(`Found ${participations?.length || 0} records with phone_number\n`);

  let imported = 0;
  let skipped = 0;

  for (const p of participations || []) {
    if (!p.phone_number) {
      skipped++;
      continue;
    }

    const timestamp = new Date(p.created_at).getTime();
    const phoneNumber = p.phone_number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const challengeTitle = (p.challenges as any)?.title || "Unknown";

    try {
      // Mixpanel import (과거 timestamp 사용)
      mixpanel.import(
        "phone_verify_success",
        timestamp,
        {
          distinct_id: phoneNumber,
          phone_number: phoneNumber,
          challenge_id: p.challenge_id,
          challenge_title: challengeTitle,
          imported: true, // import된 데이터 표시
          ...COMMON_PROPERTIES,
        }
      );

      imported++;
      console.log(`[${imported}] Imported: ${phoneNumber} (${p.created_at})`);
    } catch (err) {
      console.error(`Error importing ${phoneNumber}:`, err);
    }
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
}

importPhoneVerifyEvents().catch(console.error);
