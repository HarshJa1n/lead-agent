import { defineHook } from "workflow";

import { buildFollowUpPrompt, buildInitialLeadReviewPrompt } from "@/lib/lead-prompt";
import type { SlackConversationInput, SlackReplyEvent } from "@/lib/types";
import {
  stepCreateManagedSession,
  stepFormatLeadReview,
  stepMaybeParseLeadReview,
  stepPostThreadMessage,
  stepSendMessageAndCollectResponse,
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

  await stepPostThreadMessage({
    channelId: input.channelId,
    threadTs: input.threadTs,
    text: "Reviewing this lead now. I’ll post a verdict and next step here shortly.",
  });

  const initialRaw = await stepSendMessageAndCollectResponse(
    sessionId,
    buildInitialLeadReviewPrompt(input),
  );
  console.log("[workflow] lead_review_initial_response", {
    sessionId,
    textLength: initialRaw.length,
    textPreview: initialRaw.slice(0, 160),
  });

  const initialReview = await stepMaybeParseLeadReview(initialRaw);
  const initialFormatted = initialReview
    ? await stepFormatLeadReview(initialReview)
    : initialRaw;

  await stepPostThreadMessage({
    channelId: input.channelId,
    threadTs: input.threadTs,
    text: initialFormatted,
  });
  console.log("[workflow] lead_review_posted_initial_reply", {
    sessionId,
    structured: !!initialReview,
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

    const followUp = await stepSendMessageAndCollectResponse(
      sessionId,
      buildFollowUpPrompt(reply.text),
    );
    console.log("[workflow] lead_review_followup_response", {
      sessionId,
      textLength: followUp.length,
      textPreview: followUp.slice(0, 160),
    });

    const maybeReview = await stepMaybeParseLeadReview(followUp);
    const formatted = maybeReview ? await stepFormatLeadReview(maybeReview) : followUp;

    await stepPostThreadMessage({
      channelId: input.channelId,
      threadTs: input.threadTs,
      text: formatted,
    });
    console.log("[workflow] lead_review_posted_followup_reply", {
      sessionId,
      structured: !!maybeReview,
    });
  }
}
