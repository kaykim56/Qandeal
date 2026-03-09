/**
 * Add a new admin user to Supabase Auth + admin_users table
 * Usage: npx tsx scripts/add-admin.ts <email>
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";

// Parse .env.local manually
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  let value = trimmed.slice(eqIdx + 1);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  envVars[key] = value;
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/add-admin.ts <email>");
  process.exit(1);
}

const supabaseUrl = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const serviceRoleKey = envVars["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

async function main() {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tempPassword = randomBytes(12).toString("base64url");

  console.log(`\nAdding admin: ${email}`);

  // 1. Create Supabase Auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      console.log("  Supabase Auth user already exists, skipping...");
    } else {
      console.error("  Failed to create auth user:", authError.message);
      process.exit(1);
    }
  } else {
    console.log("  Supabase Auth user created:", authUser.user.id);
  }

  // 2. Insert into admin_users table
  const { error: dbError } = await supabase
    .from("admin_users")
    .upsert({ email }, { onConflict: "email" });

  if (dbError) {
    console.error("  Failed to insert admin_users row:", dbError.message);
    process.exit(1);
  } else {
    console.log("  admin_users row added");
  }

  console.log("\n=== Done ===");
  console.log(`Email:    ${email}`);
  console.log(`Password: ${tempPassword}`);
  console.log("\nPlease share this password securely with the user and ask them to change it.");
}

main();
