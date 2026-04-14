import { defineHook } from "workflow";

import { getAssistantSuggestedPrompts } from "@/lib/assistant-prompts";
import { buildFollowUpPrompt } from "@/lib/lead-prompt";
import type { AssistantThreadInput, SlackReplyEvent } from "@/lib/types";
import {
  stepCreateManagedSession,
  stepPostThreadMessage,
  stepSendMessageAndCollectResponse,
  stepSetAssistantStatus,
  stepSetAssistantSuggestedPrompts,
  stepSetAssistantTitle,
} from "@/workflows/steps";

export const assistantReplyHook = defineHook<SlackReplyEvent>();

export async function assistantThreadWorkflow(input: AssistantThreadInput) {
  "use workflow";

  console.log("[workflow] assistant_thread_start", {
    channelId: input.channelId,
    threadTs: input.threadTs,
    userId: input.userId,
    contextChannelId: input.context.channelId,
  });

  const sessionId = await stepCreateManagedSession();
  console.log("[workflow] assistant_thread_session_ready", { sessionId });

  await stepSetAssistantTitle({
    channelId: input.channelId,
    threadTs: input.threadTs,
    title: "Lead Review Assistant",
  });

  await stepSetAssistantSuggestedPrompts({
    channelId: input.channelId,
    threadTs: input.threadTs,
    title: "Try one of these",
    prompts: getAssistantSuggestedPrompts(),
  });

  await stepPostThreadMessage({
    channelId: input.channelId,
    threadTs: input.threadTs,
    text:
      "I’m ready to help with lead review and enrichment. Paste a lead, ask a qualification question, or use one of the suggested prompts above.",
  });
  const replies = assistantReplyHook.create({
    token: `assistant-thread:${input.channelId}:${input.threadTs}`,
  });

  for await (const reply of replies) {
    console.log("[workflow] assistant_thread_reply_received", {
      sessionId,
      userId: reply.userId,
      textLength: reply.text.length,
      textPreview: reply.text.slice(0, 120),
    });

    await stepSetAssistantStatus({
      channelId: input.channelId,
      threadTs: input.threadTs,
      status: "Reviewing lead context…",
      loadingMessages: [
        "Reading the lead details…",
        "Checking fit and signals…",
        "Preparing a recommendation…",
      ],
    });

    const response = await stepSendMessageAndCollectResponse(
      sessionId,
      buildFollowUpPrompt(reply.text),
    );
    console.log("[workflow] assistant_thread_response", {
      sessionId,
      textLength: response.length,
      textPreview: response.slice(0, 160),
    });

  await stepPostThreadMessage({
    channelId: input.channelId,
    threadTs: input.threadTs,
    text: response,
  });
    console.log("[workflow] assistant_thread_posted_reply", {
      sessionId,
    });

    await stepSetAssistantStatus({
      channelId: input.channelId,
      threadTs: input.threadTs,
      status: "",
    });
  }
}
