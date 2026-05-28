#!/usr/bin/env node
/**
 * One-off verification: do the AWS credentials in .env.local authenticate?
 *
 * Calls STS GetCallerIdentity, which requires no IAM permissions beyond
 * having a valid signature — i.e., the lowest-privilege way to confirm
 * "your keys work."
 *
 * Reads .env.local from the bakeoff worktree root. Does NOT echo secrets.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "../../../.env.local");

// Parse .env.local minimally — just AWS_* keys, ignore everything else.
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line.startsWith("AWS_"))
    .map((line) => {
      const eq = line.indexOf("=");
      return [line.slice(0, eq).trim(), line.slice(eq + 1).trim()];
    }),
);

const required = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"];
const missing = required.filter((k) => !env[k]);
if (missing.length > 0) {
  console.error("Missing env vars:", missing.join(", "));
  process.exit(2);
}

const client = new STSClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

try {
  const result = await client.send(new GetCallerIdentityCommand({}));
  console.log("✓ AWS credentials authenticate successfully");
  console.log("  Account:", result.Account);
  console.log("  ARN:", result.Arn);
  console.log("  UserId:", result.UserId?.slice(0, 8) + "...");
  process.exit(0);
} catch (err) {
  console.error("✗ AWS credentials FAILED to authenticate");
  console.error("  Error:", err.name, "—", err.message);
  process.exit(1);
}
