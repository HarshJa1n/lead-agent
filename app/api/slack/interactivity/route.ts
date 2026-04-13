import { start } from "workflow/api";

import { env } from "@/lib/env";
import { verifySlackSignature } from "@/lib/slack-signature";
import { verifySlackVerificationToken } from "@/lib/slack-token-fallback";
import type { SlackConversationInput } from "@/lib/types";
import { leadReviewWorkflow } from "@/workflows/lead-review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SlackShortcutPayload = {
  type: string;
  user?: { id: string };
  channel?: { id: string };
  message?: { ts: string; text: string; thread_ts?: string };
};

function buildShortcutInput(payload: SlackShortcutPayload): SlackConversationInput | null {
  const userId = payload.user?.id;
  const channelId = payload.channel?.id;
  const messageTs = payload.message?.ts;
  const sourceText = payload.message?.text;

  if (!userId || !channelId || !messageTs || !sourceText) {
    return null;
  }

  return {
    channelId,
    threadTs: payload.message?.thread_ts ?? messageTs,
    sourceMessageTs: messageTs,
    sourceText,
    triggerUserId: userId,
    triggerType: "message_shortcut",
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");

  const form = new URLSearchParams(rawBody);
  const payloadValue = form.get("payload");

  if (!payloadValue) {
    return new Response("missing payload", { status: 400 });
  }

  const payload = JSON.parse(payloadValue) as SlackShortcutPayload;
  const skipVerification = env.skipSlackSignatureVerification();

  if (!skipVerification && !verifySlackSignature(rawBody, timestamp, signature)) {
    const tokenAccepted = verifySlackVerificationToken(
      (payload as SlackShortcutPayload & { token?: string }).token,
    );

    if (!tokenAccepted) {
      console.warn("[slack/interactivity] signature_failed");
      return new Response("invalid signature", { status: 401 });
    }

    console.warn("[slack/interactivity] signature_failed_but_token_fallback_accepted");
  }

  if (skipVerification) {
    console.warn("[slack/interactivity] signature_verification_skipped");
  }

  console.log("[slack/interactivity] accepted", {
    type: payload.type,
  });
  const input = buildShortcutInput(payload);

  if (!input) {
    return new Response("unsupported payload", { status: 400 });
  }

  await start(leadReviewWorkflow, [input]);
  return new Response("");
}
