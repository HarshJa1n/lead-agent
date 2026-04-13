import { createManagedSession, sendMessageAndCollectResponse } from "@/lib/anthropic-managed-agent";
import { formatLeadReview } from "@/lib/format-review";
import { parseLeadReview } from "@/lib/parse-review";
import {
  postThreadMessage,
  setAssistantStatus,
  setAssistantSuggestedPrompts,
  setAssistantTitle,
} from "@/lib/slack-client";
import type { LeadReviewResult } from "@/lib/types";

export async function stepCreateManagedSession() {
  "use step";

  return createManagedSession();
}

export async function stepSendMessageAndCollectResponse(sessionId: string, prompt: string) {
  "use step";

  return sendMessageAndCollectResponse(sessionId, prompt);
}

export async function stepPostThreadMessage(params: {
  channelId: string;
  threadTs: string;
  text: string;
}) {
  "use step";

  return postThreadMessage(params);
}

export async function stepSetAssistantTitle(params: {
  channelId: string;
  threadTs: string;
  title: string;
}) {
  "use step";

  return setAssistantTitle(params);
}

export async function stepSetAssistantSuggestedPrompts(params: {
  channelId: string;
  threadTs: string;
  prompts: Array<{ title: string; message: string }>;
  title?: string;
}) {
  "use step";

  return setAssistantSuggestedPrompts(params);
}

export async function stepSetAssistantStatus(params: {
  channelId: string;
  threadTs: string;
  status: string;
  loadingMessages?: string[];
}) {
  "use step";

  return setAssistantStatus(params);
}

export async function stepParseLeadReview(text: string): Promise<LeadReviewResult> {
  "use step";

  return parseLeadReview(text);
}

export async function stepFormatLeadReview(result: LeadReviewResult) {
  "use step";

  return formatLeadReview(result);
}
