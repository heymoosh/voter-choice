#!/usr/bin/env node
/**
 * Probe Textract access on the scoped IAM user.
 *
 * Tries DetectDocumentText and AnalyzeDocument with a 1x1 PNG. Either succeeds
 * (returns 0 blocks → that's fine, the service accepted us) or fails with a
 * specific error. We surface the error name + message so we can debug whether
 * the issue is:
 *  - "needs a subscription for the service" (account-level Textract opt-in)
 *  - "AccessDenied" (IAM policy doesn't include textract:*)
 *  - "InvalidImageFormatException" (image too small, but we got past auth)
 *  - "ThrottlingException" (we're authed, just rate-limited)
 *
 * Reads .env.local. Does NOT echo secrets.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TextractClient,
  AnalyzeDocumentCommand,
  DetectDocumentTextCommand,
} from "@aws-sdk/client-textract";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "../../../.env.local");

const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line.startsWith("AWS_"))
    .map((line) => {
      const eq = line.indexOf("=");
      return [line.slice(0, eq).trim(), line.slice(eq + 1).trim()];
    }),
);

// Tiny 5x5 white PNG — enough to be a valid image, small enough to be cheap.
// Generated with Node:
//   buf = Buffer.alloc(...); use sharp or pdfjs... but quickest: hardcode hex.
const TINY_PNG_HEX =
  "89504e470d0a1a0a0000000d49484452000000050000000508060000008d6f26e5" +
  "0000001c4944415478da636060606060606000020602000000ffff03000005000180" +
  "9c8b8a200000000049454e44ae426082";
const TINY_PNG = Buffer.from(TINY_PNG_HEX, "hex");

const regions = [env.AWS_REGION || "us-east-1"];
// If specifically failing in us-east-1, try us-west-2 too — different
// regional Textract availability tier.
if (!regions.includes("us-west-2")) regions.push("us-west-2");

for (const region of regions) {
  console.log(`\n--- region: ${region} ---`);
  const client = new TextractClient({
    region,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });

  for (const op of ["DetectDocumentText", "AnalyzeDocument"]) {
    process.stdout.write(`  ${op}: `);
    try {
      if (op === "DetectDocumentText") {
        await client.send(
          new DetectDocumentTextCommand({ Document: { Bytes: TINY_PNG } }),
        );
      } else {
        await client.send(
          new AnalyzeDocumentCommand({
            Document: { Bytes: TINY_PNG },
            FeatureTypes: ["FORMS"],
          }),
        );
      }
      console.log("✓ accepted");
    } catch (err) {
      console.log(`✗ ${err.name}: ${err.message.slice(0, 200)}`);
    }
  }
}
