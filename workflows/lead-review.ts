import { defineHook } from "workflow";

import { createManagedSession, sendMessageAndCollectResponse } from "@/lib/anthropic-managed-agent";
import { formatLeadReview } from "@/lib/format-review";
import { buildFollowUpPrompt, buildInitialLeadReviewPrompt } from "@/lib/lead-prompt";
import { parseLeadReview } from "@/lib/parse-review";
import { postThreadMessage } from "@/lib/slack-client";
import type { SlackConversationInput, SlackReplyEvent } from "@/lib/types";

export const slackReplyHook = defineHook<SlackReplyEvent>();

export async function leadReviewWorkflow(input: SlackConversationInput) {
  "use workflow";

  await postThreadMessage({
    channelId: input.channelId,
    threadTs: input.threadTs,
    text: "Reviewing this lead now. I’ll post a verdict and next step here shortly.",
  });

  const sessionId = await createManagedSession();

  const initialRaw = await sendMessageAndCollectResponse(
    sessionId,
    buildInitialLeadReviewPrompt(input),
  );
  const initialReview = parseLeadReview(initialRaw);

  await postThreadMessage({
    channelId: input.channelId,
    threadTs: input.threadTs,
    text: formatLeadReview(initialReview),
  });

  const replies = slackReplyHook.create({
    token: `lead-thread:${input.channelId}:${input.threadTs}`,
  });

  for await (const reply of replies) {
    const followUp = await sendMessageAndCollectResponse(
      sessionId,
      buildFollowUpPrompt(reply.text),
    );

    const maybeReview = parseLeadReview(followUp);
    const looksStructured = maybeReview.rawText.includes("{") && maybeReview.rawText.includes("}");

    await postThreadMessage({
      channelId: input.channelId,
      threadTs: input.threadTs,
      text: looksStructured ? formatLeadReview(maybeReview) : followUp,
    });
  }
}
