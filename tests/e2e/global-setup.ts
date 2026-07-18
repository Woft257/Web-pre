import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

export default function globalSetup() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // CI can provide the local test variables directly.
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("E2E requires NEXT_PUBLIC_SUPABASE_URL");
  const hostname = new URL(supabaseUrl).hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(hostname)) {
    throw new Error("E2E database reset is only allowed against loopback Supabase");
  }
  const childEnv = {
    ...process.env,
    HOME: tmpdir(),
    USERPROFILE: tmpdir(),
  };

  if (process.platform === "win32") {
    execFileSync(process.env.ComSpec ?? "cmd.exe", [
      "/d",
      "/s",
      "/c",
      "npx.cmd supabase db reset --local",
    ], { env: childEnv, stdio: "inherit" });
  } else {
    execFileSync("npx", ["supabase", "db", "reset", "--local"], {
      env: childEnv,
      stdio: "inherit",
    });
  }
}
