const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error("Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

const API_BASE = "https://api.anthropic.com/v1";
const headers = {
  "x-api-key": apiKey,
  "anthropic-version": "2023-06-01",
  "anthropic-beta": "managed-agents-2026-04-01",
  "content-type": "application/json",
};

async function post(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

const agent = await post("/agents", {
  name: "harshja1n lead review assistant",
  model: "claude-sonnet-4-6",
  system: `You are an AI analyst supporting a Slack-based lead review workflow.

Your responsibilities:
1. Enrich leads using the tools available in the managed agent environment
2. Evaluate fit based on evidence
3. Keep answers concise and operational for sales reviewers

Rules:
- Prefer evidence over guesswork
- State uncertainty clearly
- If data is missing, say so
- Never claim that side effects are already complete unless a tool result confirms it
- For lead review requests, return only valid JSON in a fenced json block when the user asks for structured review output`,
  tools: [{ type: "agent_toolset_20260401" }],
});

const environment = await post("/environments", {
  name: "harshja1n-lead-review-env",
  config: {
    type: "cloud",
    networking: { type: "unrestricted" },
  },
});

console.log(
  JSON.stringify(
    {
      agentId: agent.id,
      agentVersion: agent.version,
      environmentId: environment.id,
    },
    null,
    2,
  ),
);
