import crypto from "node:crypto";

import { env } from "@/lib/env";

const FIVE_MINUTES = 60 * 5;

export function verifySlackSignature(rawBody: string, timestamp: string | null, signature: string | null) {
  if (!timestamp || !signature) {
    return false;
  }

  const ts = Number(timestamp);

  if (!Number.isFinite(ts)) {
    return false;
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (age > FIVE_MINUTES) {
    return false;
  }

  const sigBase = `v0:${timestamp}:${rawBody}`;
  const digest = crypto
    .createHmac("sha256", env.slackSigningSecret())
    .update(sigBase)
    .digest("hex");

  const expected = `v0=${digest}`;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
