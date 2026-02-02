import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// .env.production 파일 수동 파싱 (올바른 환경 변수명 포함)
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

async function migrate() {
  console.log("=== UTC to KST Migration ===\n");

  // 1. 현재 데이터 확인
  const { data: before, error: beforeError } = await supabase
    .from("participations")
    .select("id, created_at, reviewed_at")
    .limit(3);

  if (beforeError) {
    console.error("Error fetching:", beforeError);
    return;
  }

  console.log("Before migration (sample):");
  console.log(JSON.stringify(before, null, 2));
  console.log("");

  // 2. 전체 데이터 조회
  const { data: all, error: fetchError } = await supabase
    .from("participations")
    .select("id, created_at, reviewed_at");

  if (fetchError) {
    console.error("Error:", fetchError);
    return;
  }

  console.log(`Total records: ${all?.length || 0}`);

  // 3. 각 레코드 업데이트 (+9시간)
  let updated = 0;
  for (const p of all || []) {
    const updates: { created_at?: string; reviewed_at?: string } = {};

    if (p.created_at) {
      const d = new Date(p.created_at);
      d.setHours(d.getHours() + 9);
      updates.created_at = d.toISOString();
    }

    if (p.reviewed_at) {
      const d = new Date(p.reviewed_at);
      d.setHours(d.getHours() + 9);
      updates.reviewed_at = d.toISOString();
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("participations")
        .update(updates)
        .eq("id", p.id);

      if (error) {
        console.error(`Error updating ${p.id}:`, error);
      } else {
        updated++;
      }
    }
  }

  console.log(`Updated: ${updated} records\n`);

  // 4. 결과 확인
  const { data: after } = await supabase
    .from("participations")
    .select("id, created_at, reviewed_at")
    .limit(3);

  console.log("After migration (sample):");
  console.log(JSON.stringify(after, null, 2));

  console.log("\n=== Migration Complete ===");
}

migrate().catch(console.error);
