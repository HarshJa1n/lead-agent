import { WebClient } from "@slack/web-api";

import { env } from "@/lib/env";

let slackClient: WebClient | null = null;

export function getSlackClient() {
  if (!slackClient) {
    const token = env.slackBotToken();

    if (!token.startsWith("xoxb-")) {
      throw new Error("SLACK_BOT_TOKEN must be a bot token starting with xoxb-");
    }

    slackClient = new WebClient(token);
  }

  return slackClient;
}

export async function postThreadMessage(params: {
  channelId: string;
  text: string;
  threadTs: string;
}) {
  const client = getSlackClient();
  return client.chat.postMessage({
    channel: params.channelId,
    text: params.text,
    thread_ts: params.threadTs,
    unfurl_links: false,
    unfurl_media: false,
  });
}

export async function setAssistantSuggestedPrompts(params: {
  channelId: string;
  threadTs: string;
  prompts: Array<{ title: string; message: string }>;
  title?: string;
}) {
  const client = getSlackClient();
  return client.assistant.threads.setSuggestedPrompts({
    channel_id: params.channelId,
    thread_ts: params.threadTs,
    prompts: params.prompts,
    title: params.title,
  });
}

export async function setAssistantStatus(params: {
  channelId: string;
  threadTs: string;
  status: string;
  loadingMessages?: string[];
}) {
  const client = getSlackClient();
  return client.assistant.threads.setStatus({
    channel_id: params.channelId,
    thread_ts: params.threadTs,
    status: params.status,
    loading_messages: params.loadingMessages,
  });
}

export async function setAssistantTitle(params: {
  channelId: string;
  threadTs: string;
  title: string;
}) {
  const client = getSlackClient();
  return client.assistant.threads.setTitle({
    channel_id: params.channelId,
    thread_ts: params.threadTs,
    title: params.title,
  });
}
