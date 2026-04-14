# ADR 0001: Slack Lead Agent Architecture

## Status
Accepted

## Context
- We wanted a real Slack AI agent experience, not a local bot running on a laptop.
- The app needed to work in Slack assistant threads, DMs, and lead-review channel threads.
- Lead review tasks can outlive Slack's request window, so request/response functions alone were not enough.
- Anthropic Managed Agents already provides the long-running agent runtime, tools, and session model, but Slack still needs an app-facing control layer.

## Decisions

### 1. Hosted Slack app plus hosted orchestration
We use a hosted Next.js app on Vercel as the Slack-facing control plane and Vercel Workflow as the durable orchestration layer.

Why:
- Slack events and interactivity need a publicly hosted endpoint.
- We need durable handling for long-running agent runs and follow-up replies.
- This keeps the backend thin while still supporting multiple future agents from one service.

### 2. Native Slack AI agent surfaces, not just a classic bot
The Slack app is configured as an Agents & AI App and handles:
- `assistant_thread_started`
- `assistant_thread_context_changed`
- DMs
- `app_mention`
- message shortcut flow

Why:
- This aligns with Slack’s current AI agent guidance.
- It gives us assistant-thread features like suggested prompts and status updates.
- It still preserves channel-thread lead review as a first-class interaction pattern.

### 3. One Anthropic Managed Agent session per Slack thread
Each Slack conversation thread maps to one Anthropic Managed Agent session.

Why:
- It matches the conversational model Slack users expect.
- It keeps follow-up context stable without rebuilding state every turn.
- It gives us a clean boundary for future persistence: `channel + thread_ts -> session_id`.

### 4. Anthropic Managed Agents is the reasoning/runtime layer
We create and reuse Managed Agent sessions rather than building our own planning loop.

Why:
- Session creation, message send, and tool-capable execution are already provided by Anthropic.
- This lets our backend focus on routing, policy, and Slack UX instead of agent runtime mechanics.

### 5. Official Anthropic SDK instead of hand-rolled HTTP streaming
We use the official `@anthropic-ai/sdk` beta sessions/events APIs rather than maintaining custom request/header logic.

Why:
- The raw HTTP approach exposed beta-version inconsistencies across endpoints.
- The SDK path is closer to Anthropic’s recommended integration flow.
- It reduces custom protocol handling and makes future upgrades easier.

### 6. Slack-native streaming instead of placeholder progress posts
We stream the agent’s real response into Slack using Slack’s Web API chat streaming support (`chat.startStream` / `chat.appendStream` / `chat.stopStream`) via `client.chatStream(...)`.

Why:
- Slack’s agent guidance recommends streaming for agent-like UX.
- This removes the need for placeholder thread messages like “reviewing this lead...”.
- The response shown in Slack is now the actual model output, not a backend-authored stand-in.

Nuance:
- Anthropic response streaming is handled.
- Slack-side streaming is now the delivery layer.
- Assistant status updates are still used in assistant threads for “working” state, but user-visible content comes from the streamed model response.

### 7. Conversational output by default
The agent is prompted to answer naturally in Slack unless the user explicitly asks for structured output.

Why:
- Forced JSON made the interaction feel mechanical.
- The Slack UI should feel conversational first, with concise lead-review formatting when needed.
- This also makes streaming cleaner because we no longer stream raw JSON blobs into Slack.

### 8. Temporary Slack signature bypass remains enabled during rollout
We currently keep the temporary Slack signature bypass support in code and control it with env configuration.

Why:
- Real Slack traffic worked only after bypassing a signature mismatch during setup.
- The app is now functionally working, so removing the bypass would be premature before we fully isolate that mismatch.

## Consequences
- We have a thin shared backend that can support more agents later without rebuilding the platform.
- The app now behaves more like a native Slack AI agent and less like a scripted bot.
- Streaming is split into two concerns:
  - Anthropic stream: source of model events
  - Slack stream: user-visible delivery channel
- The assistant-pane experience remains richer than plain channel threads because it can show thread status and suggested prompts.

## Follow-up work
- Persist thread-to-session mapping in a durable store instead of keeping it only in workflow execution state.
- Remove the temporary Slack signature bypass after root-causing the mismatch.
- Add optional Slack feedback buttons once the core reply path is fully stable.
- Add real enrichment tools and internal system lookups behind the Managed Agent.
