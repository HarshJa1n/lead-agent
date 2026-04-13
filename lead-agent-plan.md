# Lead Review Slack Agent Plan

## Goal

Build a Slack AI agent for the lead review workflow that:

1. Enriches a lead from available public and internal sources
2. Reviews the lead against a clear qualification rubric
3. Posts a concise recommendation in the Slack thread
4. Lets humans approve or steer any downstream actions

The first version should be read-only except for posting results back into Slack.

## Product Shape

The system has three layers:

1. Slack app
2. Orchestrator backend
3. Claude Managed Agent runtime

Slack is the interface layer. The backend is the policy and integration layer. Claude Managed Agents is the reasoning and tool-using execution layer.

## Primary User Flows

### Flow 1: Review a lead from a channel post

1. A rep or reviewer posts a lead in `#lead-review`
2. Someone invokes the agent with either:
   - `@agent review`
   - a message shortcut like `Review lead`
3. The Slack app captures:
   - channel ID
   - thread TS
   - source message text
   - actor user ID
4. The backend extracts structured seed fields from the message
5. The backend creates or resumes a Claude Managed Agent session for this thread
6. The agent runs enrichment and review
7. The Slack app posts:
   - a short progress update
   - a final threaded review summary
8. Humans decide what to do next

### Flow 2: Ask follow-up questions in thread

1. A user replies in the same Slack thread
2. The backend routes that reply to the same agent session
3. The agent answers with awareness of:
   - prior review
   - prior enrichment artifacts
   - current thread state

### Flow 3: Private deep dive

1. A user opens the app in DM or agent pane
2. They ask for a deeper review or draft outreach
3. The agent can use the same lead context while returning privately

## Recommended Slack Entry Points

### Start with these

1. `app_mention` in the lead review channel
2. Message shortcut on a lead post
3. DM with the app

### Add later

1. App Home as a queue/dashboard
2. Automatic draft review when a new lead is posted
3. Buttons for approve, assign, create CRM note, reject

## Slack UX Rules

1. Channel-triggered reviews should reply in the existing thread
2. The main response should be concise and operational
3. Long evidence can be hidden behind a secondary action like `Show evidence`
4. Sensitive details should go to DM or ephemeral responses when appropriate
5. The agent should clearly say what it knows, what it inferred, and what is missing

## Response Format

Use a fixed structure for predictable output:

1. `Verdict`
2. `Why it looks promising`
3. `Risks / concerns`
4. `Missing information`
5. `Recommended next step`
6. `Confidence`

Example:

```text
Verdict: Good fit for outbound follow-up

Why it looks promising
- Mid-market B2B company
- Clear hiring/growth signals
- Team appears to match ICP

Risks / concerns
- Buying authority unclear
- No confirmed budget or active evaluation

Missing information
- Current tool stack
- Team size confirmation

Recommended next step
- SDR to verify team size and current workflow

Confidence
- Medium
```

## High-Level Architecture

### 1. Slack App

Responsibilities:

1. Receive Slack events and interactivity payloads
2. Normalize channel/thread/user context
3. Post progress and result messages
4. Keep Slack-specific logic out of the agent prompt

Suggested handlers:

1. `app_mention`
2. `message.im`
3. `shortcut` for `Review lead`
4. `block_actions` for buttons
5. `view_submission` if using modals later

### 2. Orchestrator Backend

Responsibilities:

1. Parse a lead from Slack input
2. Decide whether work is simple or should go to a managed agent session
3. Create or reuse Claude Managed Agent sessions
4. Expose tools the agent can call
5. Enforce permissions and action gating
6. Persist thread-to-lead and thread-to-session mappings

Core services:

1. Slack event service
2. Lead parsing service
3. Session manager
4. Tool gateway
5. Result formatter
6. Audit logger

### 3. Claude Managed Agent

Responsibilities:

1. Decide which tools to use
2. Gather evidence
3. Reason about lead quality
4. Produce structured output
5. Answer follow-up questions over multiple turns

The managed agent should not directly know Slack protocol details. It should work with normalized task inputs and tool outputs.

## Session Design

Use one Claude Managed Agent session per Slack lead thread.

### Why

1. A thread naturally maps to one lead discussion
2. Follow-up questions stay in the same context
3. Prior enrichment does not need to be recomputed each turn

### Mapping table

Store:

1. `slack_channel_id`
2. `slack_thread_ts`
3. `lead_id`
4. `managed_agent_session_id`
5. `managed_agent_agent_id`
6. `status`
7. `last_review_summary`
8. `last_updated_at`

## Lead State Model

Persist a compact structured state instead of relying on raw thread replay every time.

```json
{
  "lead_id": "lead_123",
  "source": {
    "channel_id": "C123",
    "thread_ts": "1711111111.111",
    "source_message_ts": "1711111111.111",
    "submitted_by": "U123"
  },
  "raw_input": {
    "text": "Acme Inc, Head of Sales Ops, 200 employees, inbound demo request"
  },
  "parsed_lead": {
    "company_name": "Acme Inc",
    "domain": null,
    "person_name": null,
    "title": "Head of Sales Ops",
    "employee_band": "200",
    "source_type": "inbound"
  },
  "enrichment": {
    "firmographics": {},
    "signals": [],
    "internal_matches": [],
    "public_evidence": []
  },
  "review": {
    "fit_score": null,
    "confidence": null,
    "verdict": null,
    "positives": [],
    "risks": [],
    "missing_info": [],
    "recommended_next_step": null
  }
}
```

## Tooling Strategy

The best design is to keep the agent narrow and tool-driven.

### Minimum tools for MVP

1. `get_lead_thread_context`
   - Returns the source message plus selected thread history
2. `lookup_internal_lead`
   - Checks CRM or your internal lead store
3. `search_company_public`
   - Gets website, company summary, location, size clues
4. `get_company_signals`
   - Hiring, funding, product, or market signals
5. `save_review_artifact`
   - Stores the structured review result
6. `post_thread_update`
   - Optional if the backend wants the agent to trigger stage updates

### Later tools

1. `assign_owner`
2. `create_crm_note`
3. `change_lead_status`
4. `draft_outreach`

Those later tools should require explicit user approval.

## Review Rubric

Define a scoring rubric outside the model so results are more stable.

Suggested rubric:

1. ICP fit
   - industry
   - company size
   - geography
   - team/function match
2. Intent
   - inbound request
   - active hiring
   - current initiative
   - urgency signals
3. Reachability
   - clear domain
   - identifiable contact
   - known owner internally
4. Risk
   - student/small business/no budget
   - agency/reseller if out of scope
   - unclear use case
   - duplicate or already closed-lost

Scoring suggestion:

1. `Strong fit`
2. `Possible fit`
3. `Weak fit`
4. `Needs human review`

The model should explain its reasoning, but the backend should own the rubric categories.

## Prompt Design

### System prompt responsibilities

The system prompt should tell the agent:

1. It is a lead review analyst
2. It must prefer evidence over guesswork
3. It must mark uncertain claims clearly
4. It must use tools before making important claims
5. It must produce the required response format
6. It must not take side-effecting actions without approval

### Suggested system prompt skeleton

```text
You are an AI analyst supporting a Slack-based lead review workflow.

Your job is to:
1. Enrich lead records using available tools
2. Evaluate the lead against the provided qualification rubric
3. Produce short, actionable recommendations for sales reviewers

Rules:
- Prefer evidence from tools over inference
- If data is missing, say it is missing
- Distinguish facts, signals, and assumptions
- Do not claim certainty when confidence is low
- Do not perform external or internal side effects unless the user explicitly approves them
- Keep final answers concise and operational

Always return:
- Verdict
- Why it looks promising
- Risks / concerns
- Missing information
- Recommended next step
- Confidence
```

### Task input template

```json
{
  "task_type": "review_lead",
  "lead_id": "lead_123",
  "source_message": "...",
  "parsed_lead": {},
  "rubric": {},
  "allowed_tools": [],
  "response_style": "slack_thread"
}
```

## Backend Decision Logic

The backend should decide between:

1. Fast path
2. Managed agent path

### Fast path

Use when:

1. The ask is simple
2. No multi-step research is needed
3. Existing stored enrichment is sufficient

Example:

- `@agent what was the previous verdict on this lead?`

### Managed agent path

Use when:

1. This is the first review for a lead
2. Public or internal research is needed
3. The user is asking a follow-up that needs more tools
4. The agent may need multiple tool calls and several minutes

## Event Flow

### Review triggered from a message shortcut

1. Slack sends shortcut payload to backend
2. Backend acknowledges immediately
3. Backend posts `Reviewing this lead...`
4. Backend parses the message into lead seed fields
5. Backend creates or resumes session
6. Backend sends a `user.message` event into the session
7. Backend streams agent events
8. Backend posts final review into the thread
9. Backend stores review artifact and session mapping

## Data Storage

Use a lightweight relational database first.

Recommended tables:

1. `lead_threads`
2. `lead_reviews`
3. `agent_sessions`
4. `agent_events`
5. `lead_feedback`

### Useful fields

`lead_reviews`

1. `id`
2. `lead_id`
3. `thread_key`
4. `verdict`
5. `fit_score`
6. `confidence`
7. `summary_json`
8. `created_by_agent_version`
9. `created_at`

`lead_feedback`

1. `review_id`
2. `slack_user_id`
3. `feedback_type`
4. `comment`
5. `created_at`

This will help you improve the rubric and prompts later.

## Guardrails

### Hard rules

1. Never auto-update CRM in MVP
2. Never auto-contact a lead
3. Never expose private CRM notes in a public channel
4. Always mark low-confidence output
5. Always preserve an audit trail of evidence sources

### Good operational defaults

1. Timeout long-running reviews and post a partial status
2. Cache enrichment results for a short time
3. Reuse prior evidence where still valid
4. Add a duplicate-lead check before deep research

## Recommended Tech Stack

### If you want fastest path

1. Node.js
2. Slack Bolt for JavaScript
3. Postgres
4. Anthropic SDK
5. A small internal tool server or direct backend tool functions

### Why Node is a good fit here

1. Slack examples and ecosystem are strong
2. Event-driven streaming is straightforward
3. Interactivity and webhooks are easy to handle

Python is also fine if your internal data and enrichment services already live there.

## MVP Build Order

### Phase 1: Threaded review

Build:

1. Slack app with `app_mention`, DM, and message shortcut
2. Backend endpoint for Slack events
3. Managed agent creation
4. One session per lead thread
5. Two tools:
   - internal lookup
   - public company search
6. Threaded result formatter

Success criteria:

1. User can invoke from one lead message
2. Agent returns a useful review in under a few minutes
3. Follow-up question works in the same thread

### Phase 2: Better enrichment and controls

Build:

1. Structured lead parser
2. Evidence viewer
3. Buttons for follow-up actions
4. Review feedback capture
5. Duplicate lead detection

### Phase 3: Workflow actions

Build:

1. CRM note creation
2. Assignment workflow
3. Approval gating
4. Auto-draft reviews for new lead posts

## Open Product Decisions

These need alignment before implementation gets too far:

1. What exactly counts as a lead post in your channel?
2. What internal systems should the agent read first?
3. What is your qualification rubric today?
4. Should the output optimize for SDRs, AEs, or RevOps reviewers?
5. Should the agent produce a score, a verdict, or both?
6. What information is too sensitive for channel posting?

## Practical Recommendation

Start narrow:

1. One channel
2. One review template
3. Read-only behavior
4. Two or three trusted tools
5. Clear human approval for anything downstream

That will get adoption faster than a broad autonomous agent on day one.
