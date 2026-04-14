import { defineHook } from "workflow";

import { buildFollowUpPrompt, buildInitialLeadReviewPrompt } from "@/lib/lead-prompt";
import type { SlackConversationInput, SlackReplyEvent } from "@/lib/types";
import {
  stepCreateManagedSession,
  stepFormatLeadReview,
  stepParseLeadReview,
  stepPostThreadMessage,
  stepSendMessageAndCollectResponse,
} from "@/workflows/steps";

export const slackReplyHook = defineHook<SlackReplyEvent>();

export async function leadReviewWorkflow(input: SlackConversationInput) {
  "use workflow";

  const sessionId = await stepCreateManagedSession();

  await stepPostThreadMessage({
    channelId: input.channelId,
    threadTs: input.threadTs,
    text: "Reviewing this lead now. I’ll post a verdict and next step here shortly.",
  });

  const initialRaw = await stepSendMessageAndCollectResponse(
    sessionId,
    buildInitialLeadReviewPrompt(input),
  );
  const initialReview = await stepParseLeadReview(initialRaw);
  const initialFormatted = await stepFormatLeadReview(initialReview);

  await stepPostThreadMessage({
    channelId: input.channelId,
    threadTs: input.threadTs,
    text: initialFormatted,
  });

  const replies = slackReplyHook.create({
    token: `lead-thread:${input.channelId}:${input.threadTs}`,
  });

  for await (const reply of replies) {
    const followUp = await stepSendMessageAndCollectResponse(
      sessionId,
      buildFollowUpPrompt(reply.text),
    );

    const maybeReview = await stepParseLeadReview(followUp);
    const looksStructured = maybeReview.rawText.includes("{") && maybeReview.rawText.includes("}");
    const formatted = looksStructured ? await stepFormatLeadReview(maybeReview) : followUp;

    await stepPostThreadMessage({
      channelId: input.channelId,
      threadTs: input.threadTs,
      text: formatted,
    });
  }
}
