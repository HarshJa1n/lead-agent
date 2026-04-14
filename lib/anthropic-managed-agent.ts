import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";
import { createThreadStreamer } from "@/lib/slack-client";

let anthropicClient: Anthropic | null = null;

function getClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: env.anthropicApiKey(),
    });
  }

  return anthropicClient;
}

export async function createManagedSession() {
  const client = getClient();
  const session = await client.beta.sessions.create({
    agent: env.anthropicAgentId(),
    environment_id: env.anthropicEnvironmentId(),
    title: "Slack lead review",
  });

  console.log("[anthropic] create_session_ok", {
    sessionId: session.id,
  });

  return session.id;
}

export async function sendMessageAndCollectResponse(sessionId: string, prompt: string) {
  const client = getClient();
  const stream = await client.beta.sessions.events.stream(sessionId);

  await client.beta.sessions.events.send(sessionId, {
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: prompt }],
      },
    ],
  });

  console.log("[anthropic] send_user_message_ok", {
    sessionId,
  });

  let output = "";

  for await (const event of stream) {
    if (event.type === "agent.message") {
      for (const block of event.content) {
        if (block.type === "text") {
          output += block.text;
        }
      }
    } else if (event.type === "session.status_idle") {
      console.log("[anthropic] stream_idle", {
        sessionId,
        textLength: output.length,
        textPreview: output.slice(0, 160),
      });

      return output.trim();
    }
  }

  console.log("[anthropic] stream_done_without_idle", {
    sessionId,
    textLength: output.length,
    textPreview: output.slice(0, 160),
  });

  return output.trim();
}

export async function streamMessageToSlack(params: {
  sessionId: string;
  prompt: string;
  channelId: string;
  threadTs: string;
  recipientTeamId?: string;
  recipientUserId?: string;
}) {
  const client = getClient();
  const stream = await client.beta.sessions.events.stream(params.sessionId);
  const streamer = createThreadStreamer({
    channelId: params.channelId,
    threadTs: params.threadTs,
    recipientTeamId: params.recipientTeamId,
    recipientUserId: params.recipientUserId,
  });

  await client.beta.sessions.events.send(params.sessionId, {
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: params.prompt }],
      },
    ],
  });

  console.log("[anthropic] send_user_message_ok", {
    sessionId: params.sessionId,
  });

  let output = "";

  try {
    for await (const event of stream) {
      if (event.type === "agent.message") {
        for (const block of event.content) {
          if (block.type === "text" && block.text) {
            output += block.text;
            await streamer.append({
              markdown_text: block.text,
            });
          }
        }
      } else if (event.type === "session.status_idle") {
        await streamer.stop();

        console.log("[anthropic] stream_idle", {
          sessionId: params.sessionId,
          textLength: output.length,
          textPreview: output.slice(0, 160),
        });

        return output.trim();
      }
    }

    await streamer.stop();
  } catch (error) {
    await streamer.stop({
      markdown_text:
        output.trim() ||
        "I hit a delivery problem while streaming this response. Please try again.",
    });
    throw error;
  }

  console.log("[anthropic] stream_done_without_idle", {
    sessionId: params.sessionId,
    textLength: output.length,
    textPreview: output.slice(0, 160),
  });

  return output.trim();
}
