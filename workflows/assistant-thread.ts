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

  const sessionId = await stepCreateManagedSession();
  const replies = assistantReplyHook.create({
    token: `assistant-thread:${input.channelId}:${input.threadTs}`,
  });

  for await (const reply of replies) {
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

    await stepPostThreadMessage({
      channelId: input.channelId,
      threadTs: input.threadTs,
      text: response,
    });

    await stepSetAssistantStatus({
      channelId: input.channelId,
      threadTs: input.threadTs,
      status: "",
    });
  }
}
