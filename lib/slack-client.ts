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
  const response = await client.chat.postMessage({
    channel: params.channelId,
    text: params.text,
    thread_ts: params.threadTs,
    unfurl_links: false,
    unfurl_media: false,
  });

  console.log("[slack/client] post_message_ok", {
    channelId: params.channelId,
    threadTs: params.threadTs,
    ts: response.ts,
  });

  return response;
}

export function createThreadStreamer(params: {
  channelId: string;
  threadTs: string;
  recipientTeamId?: string;
  recipientUserId?: string;
  bufferSize?: number;
}) {
  const client = getSlackClient();

  return client.chatStream({
    channel: params.channelId,
    thread_ts: params.threadTs,
    recipient_team_id: params.recipientTeamId,
    recipient_user_id: params.recipientUserId,
    buffer_size: params.bufferSize ?? 180,
  });
}

export async function setAssistantSuggestedPrompts(params: {
  channelId: string;
  threadTs: string;
  prompts: Array<{ title: string; message: string }>;
  title?: string;
}) {
  const client = getSlackClient();
  const response = await client.assistant.threads.setSuggestedPrompts({
    channel_id: params.channelId,
    thread_ts: params.threadTs,
    prompts: params.prompts,
    title: params.title,
  });

  console.log("[slack/client] set_suggested_prompts_ok", {
    channelId: params.channelId,
    threadTs: params.threadTs,
  });

  return response;
}

export async function setAssistantStatus(params: {
  channelId: string;
  threadTs: string;
  status: string;
  loadingMessages?: string[];
}) {
  const client = getSlackClient();
  const response = await client.assistant.threads.setStatus({
    channel_id: params.channelId,
    thread_ts: params.threadTs,
    status: params.status,
    loading_messages: params.loadingMessages,
  });

  console.log("[slack/client] set_status_ok", {
    channelId: params.channelId,
    threadTs: params.threadTs,
    status: params.status,
  });

  return response;
}

export async function setAssistantTitle(params: {
  channelId: string;
  threadTs: string;
  title: string;
}) {
  const client = getSlackClient();
  const response = await client.assistant.threads.setTitle({
    channel_id: params.channelId,
    thread_ts: params.threadTs,
    title: params.title,
  });

  console.log("[slack/client] set_title_ok", {
    channelId: params.channelId,
    threadTs: params.threadTs,
    title: params.title,
  });

  return response;
}
