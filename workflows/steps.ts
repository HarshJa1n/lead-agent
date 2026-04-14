import {
  createManagedSession,
  streamMessageToSlack,
} from "@/lib/anthropic-managed-agent";
import {
  setAssistantStatus,
  setAssistantSuggestedPrompts,
  setAssistantTitle,
} from "@/lib/slack-client";

export async function stepCreateManagedSession() {
  "use step";

  return createManagedSession();
}

export async function stepStreamManagedResponseToSlack(params: {
  sessionId: string;
  prompt: string;
  channelId: string;
  threadTs: string;
  recipientTeamId?: string;
  recipientUserId?: string;
}) {
  "use step";

  return streamMessageToSlack(params);
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
