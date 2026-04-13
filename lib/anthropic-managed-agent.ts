import { env } from "@/lib/env";

const API_BASE = "https://api.anthropic.com/v1";
const API_VERSION = "2023-06-01";
const MANAGED_AGENTS_BETA = "managed-agents-2026-04-01";

async function anthropicFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "x-api-key": env.anthropicApiKey(),
      "anthropic-version": API_VERSION,
      "anthropic-beta": MANAGED_AGENTS_BETA,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed (${response.status}): ${await response.text()}`);
  }

  return response;
}

export async function createManagedSession() {
  const response = await anthropicFetch("/sessions", {
    method: "POST",
    body: JSON.stringify({
      agent: env.anthropicAgentId(),
      environment_id: env.anthropicEnvironmentId(),
      title: "Slack lead review",
    }),
  });

  const payload = (await response.json()) as { id: string };
  return payload.id;
}

async function sendUserMessage(sessionId: string, prompt: string) {
  await anthropicFetch(`/sessions/${sessionId}/events`, {
    method: "POST",
    body: JSON.stringify({
      events: [
        {
          type: "user.message",
          content: [{ type: "text", text: prompt }],
        },
      ],
    }),
  });
}

export async function sendMessageAndCollectResponse(sessionId: string, prompt: string) {
  await sendUserMessage(sessionId, prompt);

  const response = await fetch(`${API_BASE}/sessions/${sessionId}/stream`, {
    headers: {
      "x-api-key": env.anthropicApiKey(),
      "anthropic-version": API_VERSION,
      "anthropic-beta": MANAGED_AGENTS_BETA,
      Accept: "text/event-stream",
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Anthropic stream failed (${response.status}): ${await response.text()}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }

      const json = line.slice(5).trim();
      if (!json) {
        continue;
      }

      const event = JSON.parse(json) as {
        type: string;
        content?: Array<{ type: string; text?: string }>;
      };

      if (event.type === "agent.message") {
        for (const block of event.content ?? []) {
          if (block.type === "text" && block.text) {
            output += block.text;
          }
        }
      }

      if (event.type === "session.status_idle") {
        return output.trim();
      }
    }
  }

  return output.trim();
}
