import { defineHook } from "workflow";

import { buildFollowUpPrompt, buildInitialLeadReviewPrompt } from "@/lib/lead-prompt";
import type { SlackConversationInput, SlackReplyEvent } from "@/lib/types";
import {
  stepCreateManagedSession,
  stepStreamManagedResponseToSlack,
} from "@/workflows/steps";

export const slackReplyHook = defineHook<SlackReplyEvent>();

export async function leadReviewWorkflow(input: SlackConversationInput) {
  "use workflow";

  console.log("[workflow] lead_review_start", {
    channelId: input.channelId,
    threadTs: input.threadTs,
    triggerType: input.triggerType,
    sourceMessageTs: input.sourceMessageTs,
  });

  const sessionId = await stepCreateManagedSession();
  console.log("[workflow] lead_review_session_ready", { sessionId });

  await stepStreamManagedResponseToSlack({
    sessionId,
    prompt: buildInitialLeadReviewPrompt(input),
    channelId: input.channelId,
    threadTs: input.threadTs,
    recipientTeamId: input.teamId,
    recipientUserId: input.triggerUserId,
  });
  console.log("[workflow] lead_review_initial_response", {
    sessionId,
    channelId: input.channelId,
    threadTs: input.threadTs,
  });

  const replies = slackReplyHook.create({
    token: `lead-thread:${input.channelId}:${input.threadTs}`,
  });

  for await (const reply of replies) {
    console.log("[workflow] lead_review_reply_received", {
      sessionId,
      userId: reply.userId,
      textLength: reply.text.length,
      textPreview: reply.text.slice(0, 120),
    });

    await stepStreamManagedResponseToSlack({
      sessionId,
      prompt: buildFollowUpPrompt(reply.text),
      channelId: input.channelId,
      threadTs: input.threadTs,
      recipientTeamId: input.teamId,
      recipientUserId: reply.userId,
    });
    console.log("[workflow] lead_review_followup_response", {
      sessionId,
      channelId: input.channelId,
      threadTs: input.threadTs,
    });
  }
}
