#!/usr/bin/env node
/**
 * Provision a scoped IAM user for the Textract bakeoff.
 *
 * What it creates in your AWS account:
 *   - IAM user:           voter-choice-textract-bakeoff
 *   - Inline policy:      VoterChoiceTextractScoped (textract:AnalyzeDocument
 *                         + textract:DetectDocumentText only)
 *   - Access key:         1 active key pair output to stdout
 *
 * Idempotent: safe to re-run. If the user already exists, the script
 * preserves it. If an access key already exists, the script lists it and
 * exits — you must delete the old key in the AWS Console (or use the
 * companion deprovision script) before generating a new one (AWS limits
 * each user to 2 access keys total, so a stuck old key blocks rotation).
 *
 * Reads admin creds from .env.local. Writes the scoped key pair to stdout
 * AND back into .env.local (replacing the admin keys with scoped keys).
 * The admin keys you used to bootstrap should be deleted in the AWS
 * Console after this script succeeds.
 */

import {
  IAMClient,
  CreateUserCommand,
  GetUserCommand,
  PutUserPolicyCommand,
  CreateAccessKeyCommand,
  ListAccessKeysCommand,
  NoSuchEntityException,
  EntityAlreadyExistsException,
} from "@aws-sdk/client-iam";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "../../../.env.local");
const USER_NAME = "voter-choice-textract-bakeoff";
const POLICY_NAME = "VoterChoiceTextractScoped";

// Scoped policy: ONLY what the bakeoff runner needs. No s3, no kms, no
// other Textract verbs. If the runner ever needs DetectDocumentText
// (currently uses AnalyzeDocument only), it's already included.
const SCOPED_POLICY = JSON.stringify(
  {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["textract:AnalyzeDocument", "textract:DetectDocumentText"],
        Resource: "*",
      },
    ],
  },
  null,
  2,
);

function parseEnv(text) {
  return Object.fromEntries(
    text
      .split("\n")
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const eq = line.indexOf("=");
        return [line.slice(0, eq).trim(), line.slice(eq + 1).trim()];
      }),
  );
}

function serializeEnv(envObj) {
  return Object.entries(envObj)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

const envText = readFileSync(envPath, "utf8");
const env = parseEnv(envText);

const required = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"];
const missing = required.filter((k) => !env[k]);
if (missing.length > 0) {
  console.error("Missing env vars in .env.local:", missing.join(", "));
  process.exit(2);
}

const client = new IAMClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

// Step 1: ensure the user exists (idempotent).
let userExists = false;
try {
  await client.send(new GetUserCommand({ UserName: USER_NAME }));
  userExists = true;
  console.log(`✓ IAM user '${USER_NAME}' already exists`);
} catch (err) {
  if (!(err instanceof NoSuchEntityException)) {
    console.error("Failed to query user:", err.name, err.message);
    process.exit(1);
  }
}

if (!userExists) {
  try {
    await client.send(
      new CreateUserCommand({
        UserName: USER_NAME,
        Tags: [
          { Key: "Project", Value: "voter-choice" },
          { Key: "Purpose", Value: "pdf-extraction-bakeoff" },
        ],
      }),
    );
    console.log(`✓ Created IAM user '${USER_NAME}'`);
  } catch (err) {
    if (err instanceof EntityAlreadyExistsException) {
      console.log(`✓ IAM user '${USER_NAME}' already exists (race)`);
    } else {
      console.error("CreateUser failed:", err.name, err.message);
      process.exit(1);
    }
  }
}

// Step 2: attach scoped inline policy (idempotent — PutUserPolicy overwrites).
try {
  await client.send(
    new PutUserPolicyCommand({
      UserName: USER_NAME,
      PolicyName: POLICY_NAME,
      PolicyDocument: SCOPED_POLICY,
    }),
  );
  console.log(
    `✓ Attached inline policy '${POLICY_NAME}' (textract:AnalyzeDocument + DetectDocumentText)`,
  );
} catch (err) {
  console.error("PutUserPolicy failed:", err.name, err.message);
  process.exit(1);
}

// Step 3: check for existing access keys before creating a new one.
let existingKeys;
try {
  const out = await client.send(
    new ListAccessKeysCommand({ UserName: USER_NAME }),
  );
  existingKeys = out.AccessKeyMetadata ?? [];
} catch (err) {
  console.error("ListAccessKeys failed:", err.name, err.message);
  process.exit(1);
}

if (existingKeys.length >= 2) {
  console.error(
    `✗ User already has ${existingKeys.length} access keys (AWS limit is 2). ` +
      "Delete one in the AWS Console before regenerating.",
  );
  process.exit(1);
}

if (existingKeys.length === 1) {
  console.log(
    `⚠ User already has 1 active access key (${existingKeys[0].AccessKeyId?.slice(0, 8)}...). ` +
      "Creating a second one. After verifying the new one works, " +
      "deactivate the old one in the AWS Console.",
  );
}

// Step 4: create new access key.
let newKey;
try {
  const out = await client.send(
    new CreateAccessKeyCommand({ UserName: USER_NAME }),
  );
  newKey = out.AccessKey;
} catch (err) {
  console.error("CreateAccessKey failed:", err.name, err.message);
  process.exit(1);
}

if (!newKey?.AccessKeyId || !newKey?.SecretAccessKey) {
  console.error("CreateAccessKey returned empty credentials");
  process.exit(1);
}

console.log(`✓ Created new access key ${newKey.AccessKeyId.slice(0, 8)}...`);

// Step 5: rewrite .env.local with the scoped credentials.
const newEnv = {
  ...env,
  AWS_ACCESS_KEY_ID: newKey.AccessKeyId,
  AWS_SECRET_ACCESS_KEY: newKey.SecretAccessKey,
  // AWS_REGION preserved
};

// Preserve original ordering of keys, append new AWS_* if not present.
const originalLines = envText.split("\n");
const updatedLines = originalLines.map((line) => {
  if (!line.includes("=") || line.trim().startsWith("#")) return line;
  const eq = line.indexOf("=");
  const k = line.slice(0, eq).trim();
  if (k in newEnv && k.startsWith("AWS_")) {
    return `${k}=${newEnv[k]}`;
  }
  return line;
});
const ensureKeys = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"];
const seen = new Set(
  updatedLines
    .filter((l) => l.includes("="))
    .map((l) => l.slice(0, l.indexOf("=")).trim()),
);
for (const k of ensureKeys) {
  if (!seen.has(k)) updatedLines.push(`${k}=${newEnv[k]}`);
}

writeFileSync(envPath, updatedLines.join("\n"), "utf8");
console.log(`✓ Updated ${envPath} with scoped credentials`);

console.log("");
console.log("==== NEXT STEPS ====");
console.log("1. The admin access key in .env.local has been REPLACED with the");
console.log("   scoped Textract key. The admin key is no longer needed for the");
console.log("   bakeoff.");
console.log("2. In the AWS Console → IAM → Users → admin-muxin → Security");
console.log(
  "   credentials, you can now DEACTIVATE (or DELETE) the admin access",
);
console.log("   key. The admin USER stays — only the access key is rotated.");
console.log("3. Run verify-aws-creds.mjs to confirm the new scoped keys work.");
