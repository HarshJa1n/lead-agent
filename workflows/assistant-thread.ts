import { defineHook } from "workflow";

import { createManagedSession, sendMessageAndCollectResponse } from "@/lib/anthropic-managed-agent";
import { getAssistantSuggestedPrompts } from "@/lib/assistant-prompts";
import { buildFollowUpPrompt } from "@/lib/lead-prompt";
import {
  postThreadMessage,
  setAssistantStatus,
  setAssistantSuggestedPrompts,
  setAssistantTitle,
} from "@/lib/slack-client";
import type { AssistantThreadInput, SlackReplyEvent } from "@/lib/types";

export const assistantReplyHook = defineHook<SlackReplyEvent>();

export async function assistantThreadWorkflow(input: AssistantThreadInput) {
  "use workflow";

  await setAssistantTitle({
    channelId: input.channelId,
    threadTs: input.threadTs,
    title: "Lead Review Assistant",
  });

  await setAssistantSuggestedPrompts({
    channelId: input.channelId,
    threadTs: input.threadTs,
    title: "Try one of these",
    prompts: getAssistantSuggestedPrompts(),
  });

  await postThreadMessage({
    channelId: input.channelId,
    threadTs: input.threadTs,
    text:
      "I’m ready to help with lead review and enrichment. Paste a lead, ask a qualification question, or use one of the suggested prompts above.",
  });

  const sessionId = await createManagedSession();
  const replies = assistantReplyHook.create({
    token: `assistant-thread:${input.channelId}:${input.threadTs}`,
  });

  for await (const reply of replies) {
    await setAssistantStatus({
      channelId: input.channelId,
      threadTs: input.threadTs,
      status: "Reviewing lead context…",
      loadingMessages: [
        "Reading the lead details…",
        "Checking fit and signals…",
        "Preparing a recommendation…",
      ],
    });

    const response = await sendMessageAndCollectResponse(
      sessionId,
      buildFollowUpPrompt(reply.text),
    );

    await postThreadMessage({
      channelId: input.channelId,
      threadTs: input.threadTs,
      text: response,
    });

    await setAssistantStatus({
      channelId: input.channelId,
      threadTs: input.threadTs,
      status: "",
    });
  }
}
