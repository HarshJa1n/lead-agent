#  Lead Review Slack Agent

This project is a hosted Slack AI agent for lead enrichment and lead review.

It uses:

1. Vercel for hosting
2. Vercel Workflow for durable Slack thread orchestration
3. Claude Managed Agents for long-running lead research and review

## What is included

1. Slack webhook route for events: `/api/slack/events`
2. Slack interactivity route for shortcuts: `/api/slack/interactivity`
3. Native Slack assistant support:
   - `assistant_thread_started`
   - `assistant_thread_context_changed`
   - assistant suggested prompts
   - assistant thread title and status updates
4. Durable workflows that:
   - starts a lead review
   - posts the first verdict in thread
   - waits for follow-up replies
   - reuses the same Claude session for follow-ups
5. A helper script to create an Anthropic managed agent and environment

## Local setup 


1. Install dependencies

```bash
npm install
```

2. Copy the environment template

```bash
cp .env.example .env.local
```

3. Create the Anthropic managed agent and environment

```bash
export ANTHROPIC_API_KEY="your-key"
npm run create:agent
```

4. Put the returned IDs into `.env.local`

```bash
ANTHROPIC_AGENT_ID=...
ANTHROPIC_ENVIRONMENT_ID=...
```

5. Start the app

```bash
npm run dev
```

## Vercel deployment

### Create or link the Vercel project

```bash
vercel link
```

Suggested project name:

```text
harshja1n-lead-review-agent
```

### Set environment variables

```bash
vercel env add ANTHROPIC_API_KEY
vercel env add ANTHROPIC_AGENT_ID
vercel env add ANTHROPIC_ENVIRONMENT_ID
vercel env add SLACK_BOT_TOKEN
vercel env add SLACK_SIGNING_SECRET
vercel env add SLACK_VERIFICATION_TOKEN
vercel env add APP_BASE_URL
```

Set `APP_BASE_URL` to your Vercel production URL, for example:

```text
https://harshja1n-lead-review-agent.vercel.app
```

### Deploy

```bash
vercel --prod
```

## Slack app setup

Create a Slack app from scratch and configure:

### Basic Information

1. App name: `Lead Review Agent`
2. Workspace: your target workspace

### OAuth scopes

Bot token scopes:

1. `app_mentions:read`
2. `assistant:write`
3. `channels:history`
4. `chat:write`
5. `groups:history`
6. `im:history`
7. `im:write`
8. `im:read`
9. `mpim:history`
10. `users:read`

Important:

1. Enable the `Agents & AI Apps` feature toggle in Slack app settings
2. That toggle is what unlocks the native assistant surfaces and `assistant:write`
3. Without it, the app will behave like a regular bot and the assistant APIs will not work

### Event subscriptions

Enable events and set:

```text
https://YOUR_DOMAIN/api/slack/events
```

Subscribe to bot events:

1. `app_mention`
2. `assistant_thread_started`
3. `assistant_thread_context_changed`
4. `message.im`
5. `message.channels` if you want thread replies picked up in channels

### Interactivity

Enable interactivity and set:

```text
https://YOUR_DOMAIN/api/slack/interactivity
```

### Message shortcut

Add a message shortcut:

1. Name: `Review lead`
2. Callback ID: `review_lead`

### Manifest

You can use the included manifest file:

[`slack-app-manifest.yaml`](/Users/appointy/code/Docs/automation/Lead-slack/slack-app-manifest.yaml)

### Install app

Install the app into your workspace and copy:

1. Bot User OAuth Token -> `SLACK_BOT_TOKEN`
2. Signing Secret -> `SLACK_SIGNING_SECRET`
3. Verification Token -> `SLACK_VERIFICATION_TOKEN`

The verification token is only used as a temporary fallback if Slack signature verification fails in your environment. The preferred path remains the signing secret.

## How the workflow works

### Native assistant flow

1. A user opens the app in Slack's AI assistant pane
2. Slack sends `assistant_thread_started`
3. The app sets:
   - thread title
   - suggested prompts
   - welcome message
4. A durable workflow starts and owns the assistant thread
5. User replies in the assistant thread
6. The workflow updates assistant status, calls Claude Managed Agents, and replies in-thread

### Channel lead-review flow

1. A user mentions the app in a channel or uses the message shortcut
2. The Vercel route starts a durable workflow
3. The workflow creates one Claude Managed Agent session for that Slack thread
4. The workflow sends the lead review request to Claude
5. Claude returns a structured review
6. The workflow posts the result back into the thread
7. The workflow pauses and waits for future thread replies
8. New replies resume the same workflow and reuse the same Claude session

## Important MVP limitations

1. This version is read-only except for posting messages in Slack
2. There is no CRM writeback yet
3. There is no persistent database yet
4. Public and internal enrichment tools are not yet custom-wired; the managed agent currently relies on its own available tools plus your prompt
5. Assistant context changes are handled lightly for now by refreshing prompts and title, not by re-indexing Slack context

## What to build next

1. Add custom tool endpoints for CRM lookup and company enrichment
2. Add approval buttons before any side effects
3. Add durable storage for audit history and review artifacts
4. Add multi-agent routing for standups and internal helpers
# lead-agent
