import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function check() {
  const { data, error } = await supabase
    .from("challenges")
    .select("id, title, status, purchase_deadline, review_deadline")
    .eq("id", "98b61ccb-eaf5-4f2f-b158-1e55a144fc97")
    .single();

  console.log("Challenge:", JSON.stringify(data, null, 2));
  if (error) console.log("Error:", error);
}

check();
