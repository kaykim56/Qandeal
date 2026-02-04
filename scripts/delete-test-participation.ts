import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env.production");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  if (line.startsWith("#") || !line.includes("=")) continue;
  const [key, ...valueParts] = line.split("=");
  let value = valueParts.join("=").replace(/^["']|["']$/g, "").replace(/\\n/g, "");
  process.env[key.trim()] = value.trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function main() {
  const { error } = await supabase
    .from("participations")
    .delete()
    .eq("id", "90cf0951-17bb-4d80-b187-ebff624eadfa");

  if (error) {
    console.error("삭제 실패:", error);
  } else {
    console.log("✅ 참여 기록 삭제 완료");
    console.log('이제 다시 접속하면 "참가 마감" 버튼이 보입니다.');
  }
}

main();
