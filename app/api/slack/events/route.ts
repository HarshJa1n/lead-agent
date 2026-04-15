import { start } from "workflow/api";

import { getAssistantSuggestedPrompts } from "@/lib/assistant-prompts";
import { env } from "@/lib/env";
import {
  addReaction,
  setAssistantSuggestedPrompts,
  setAssistantTitle,
} from "@/lib/slack-client";
import { getSlackSignatureDebugInfo, verifySlackSignature } from "@/lib/slack-signature";
import { verifySlackVerificationToken } from "@/lib/slack-token-fallback";
import type { AssistantThreadInput, SlackConversationInput } from "@/lib/types";
import { assistantReplyHook, assistantThreadWorkflow } from "@/workflows/assistant-thread";
import { slackReplyHook, leadReviewWorkflow } from "@/workflows/lead-review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SlackEventEnvelope = {
  type: string;
  team_id?: string;
  challenge?: string;
  event?: {
    type?: string;
    subtype?: string;
    user?: string;
    text?: string;
    channel?: string;
    ts?: string;
    thread_ts?: string;
    bot_id?: string;
    channel_type?: string;
    assistant_thread?: {
      user_id: string;
      channel_id: string;
      thread_ts: string;
      context?: {
        channel_id?: string;
        team_id?: string;
        enterprise_id?: string | null;
      };
    };
  };
};

function shouldResumeThread(event: NonNullable<SlackEventEnvelope["event"]>) {
  if (event.subtype || event.bot_id || !event.thread_ts || !event.text || !event.user) {
    return false;
  }

  return event.type === "message" || event.type === "app_mention";
}

function isAssistantThreadStart(event: NonNullable<SlackEventEnvelope["event"]>) {
  return event.type === "assistant_thread_started" && !!event.assistant_thread;
}

function isAssistantThreadContextChanged(event: NonNullable<SlackEventEnvelope["event"]>) {
  return event.type === "assistant_thread_context_changed" && !!event.assistant_thread;
}

function isNewLeadReview(event: NonNullable<SlackEventEnvelope["event"]>) {
  if (event.subtype || event.bot_id || !event.text || !event.user || !event.channel || !event.ts) {
    return false;
  }

  if (event.type === "message" && event.channel_type === "im") {
    return true;
  }

  return event.type === "app_mention" && !event.thread_ts;
}

function toConversationInput(
  event: NonNullable<SlackEventEnvelope["event"]>,
  teamId?: string,
): SlackConversationInput {
  return {
    channelId: event.channel!,
    threadTs: event.thread_ts ?? event.ts!,
    sourceMessageTs: event.ts!,
    sourceText: event.text!,
    triggerUserId: event.user!,
    teamId,
    triggerType: event.channel_type === "im" ? "dm" : "app_mention",
  };
}

function toAssistantThreadInput(
  event: NonNullable<SlackEventEnvelope["event"]>,
): AssistantThreadInput | null {
  const assistantThread = event.assistant_thread;

  if (!assistantThread) {
    return null;
  }

  return {
    channelId: assistantThread.channel_id,
    threadTs: assistantThread.thread_ts,
    userId: assistantThread.user_id,
    context: {
      channelId: assistantThread.context?.channel_id,
      teamId: assistantThread.context?.team_id,
      enterpriseId: assistantThread.context?.enterprise_id,
    },
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: SlackEventEnvelope | null = null;

  try {
    payload = JSON.parse(rawBody) as SlackEventEnvelope;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  if (payload.type === "url_verification" && payload.challenge) {
    console.log("[slack/events] url_verification");
    return Response.json({ challenge: payload.challenge });
  }

  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");
  const debug = getSlackSignatureDebugInfo(rawBody, timestamp, signature);
  const skipVerification = env.skipSlackSignatureVerification();

  if (!skipVerification && !verifySlackSignature(rawBody, timestamp, signature)) {
    const tokenAccepted = verifySlackVerificationToken((payload as { token?: string }).token);

    if (tokenAccepted) {
      console.warn("[slack/events] signature_failed_but_token_fallback_accepted", {
        reason: debug.reason,
        payloadType: payload.type,
        eventType: payload.event?.type,
      });
    } else {
    console.warn("[slack/events] signature_failed", {
      reason: debug.reason,
      age: "age" in debug ? debug.age : undefined,
      payloadType: payload.type,
      eventType: payload.event?.type,
      hasAssistantThread: !!payload.event?.assistant_thread,
      expectedPrefix: "expectedPrefix" in debug ? debug.expectedPrefix : undefined,
      receivedPrefix: "receivedPrefix" in debug ? debug.receivedPrefix : undefined,
    });
      return new Response("invalid signature", { status: 401 });
    }
  }

  if (skipVerification) {
    console.warn("[slack/events] signature_verification_skipped");
  }

  const event = payload.event;
  console.log("[slack/events] accepted", {
    payloadType: payload.type,
    eventType: event?.type,
    subtype: event?.subtype,
    channelType: event?.channel_type,
  });

  if (!event) {
    return new Response("ok");
  }

  if (isAssistantThreadStart(event)) {
    console.log("[slack/events] assistant_thread_started");
    const input = toAssistantThreadInput(event);
    if (input) {
      await start(assistantThreadWorkflow, [input]);
    }

    return new Response("ok");
  }

  if (isAssistantThreadContextChanged(event)) {
    console.log("[slack/events] assistant_thread_context_changed");
    const input = toAssistantThreadInput(event);
    if (input) {
      await setAssistantTitle({
        channelId: input.channelId,
        threadTs: input.threadTs,
        title: input.context.channelId ? "Lead Review Assistant" : "Lead Review Assistant",
      });

      await setAssistantSuggestedPrompts({
        channelId: input.channelId,
        threadTs: input.threadTs,
        title: input.context.channelId
          ? "Use channel context or paste a lead"
          : "Try one of these",
        prompts: getAssistantSuggestedPrompts(),
      });
    }

    return new Response("ok");
  }

  if (isNewLeadReview(event)) {
    console.log("[slack/events] starting_lead_review", {
      triggerType: event.channel_type === "im" ? "dm" : "app_mention",
    });

    if (event.type === "app_mention" && !event.thread_ts) {
      await addReaction({
        channelId: event.channel!,
        timestamp: event.ts!,
        name: "eyes",
      });
    }

    await start(leadReviewWorkflow, [toConversationInput(event, payload.team_id)]);
    return new Response("ok");
  }

  if (event.type === "app_mention" && event.thread_ts && !event.subtype && !event.bot_id) {
    console.log("[slack/events] thread_mention_received", {
      channelId: event.channel,
      threadTs: event.thread_ts,
    });

    const replyPayload = {
      text: event.text!,
      userId: event.user!,
    };

    try {
      await slackReplyHook.resume(`lead-thread:${event.channel}:${event.thread_ts}`, replyPayload);
      console.log("[slack/events] thread_mention_resumed_existing_workflow", {
        channelId: event.channel,
        threadTs: event.thread_ts,
      });
    } catch {
      await addReaction({
        channelId: event.channel!,
        timestamp: event.ts!,
        name: "eyes",
      });

      await start(leadReviewWorkflow, [toConversationInput(event, payload.team_id)]);
      console.log("[slack/events] thread_mention_started_new_workflow", {
        channelId: event.channel,
        threadTs: event.thread_ts,
      });
    }

    return new Response("ok");
  }

  if (shouldResumeThread(event)) {
    console.log("[slack/events] resuming_thread", {
      threadTs: event.thread_ts,
      channelType: event.channel_type,
    });
    try {
      const payload = {
        text: event.text!,
        userId: event.user!,
      };

      if (event.channel_type === "im") {
        await assistantReplyHook.resume(`assistant-thread:${event.channel}:${event.thread_ts}`, payload);
      } else {
        await slackReplyHook.resume(`lead-thread:${event.channel}:${event.thread_ts}`, payload);
      }
    } catch {
      // No active workflow is listening for this thread; ignore it safely.
    }
  }

  console.log("[slack/events] no_matching_handler");

  return new Response("ok");
}
