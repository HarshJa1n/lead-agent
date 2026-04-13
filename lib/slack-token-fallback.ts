import { env } from "@/lib/env";

export function verifySlackVerificationToken(token: string | undefined | null) {
  const expected = env.slackVerificationToken();

  if (!expected || !token) {
    return false;
  }

  return token === expected;
}
