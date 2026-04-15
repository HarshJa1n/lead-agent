import { defineHook } from "workflow";

import {
  buildFollowUpPrompt,
  buildInitialLeadReviewPrompt,
  stripSlackMentions,
} from "@/lib/lead-prompt";
import type { SlackConversationInput, SlackReplyEvent } from "@/lib/types";
import {
  stepAddReaction,
  stepCreateManagedSession,
  stepFetchThreadTranscript,
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

  if (input.triggerType === "dm" || input.triggerType === "message_shortcut") {
    await stepAddReaction({
      channelId: input.channelId,
      timestamp: input.sourceMessageTs,
      name: "eyes",
    });
  }

  const sessionId = await stepCreateManagedSession();
  console.log("[workflow] lead_review_session_ready", { sessionId });

  const threadContext = await stepFetchThreadTranscript({
    channelId: input.channelId,
    threadTs: input.threadTs,
  });
  console.log("[workflow] lead_review_thread_context_loaded", {
    channelId: input.channelId,
    threadTs: input.threadTs,
    transcriptLength: threadContext.length,
  });

  await stepStreamManagedResponseToSlack({
    sessionId,
    prompt: buildInitialLeadReviewPrompt({
      ...input,
      threadContext,
    }),
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

    const followUpThreadContext = await stepFetchThreadTranscript({
      channelId: input.channelId,
      threadTs: input.threadTs,
    });
    console.log("[workflow] lead_review_followup_thread_context_loaded", {
      channelId: input.channelId,
      threadTs: input.threadTs,
      transcriptLength: followUpThreadContext.length,
    });

    await stepStreamManagedResponseToSlack({
      sessionId,
      prompt: buildFollowUpPrompt({
        userMessage: reply.text,
        cleanedUserMessage: stripSlackMentions(reply.text),
        threadContext: followUpThreadContext,
      }),
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
