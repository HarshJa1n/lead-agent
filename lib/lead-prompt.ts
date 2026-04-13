import type { SlackConversationInput } from "@/lib/types";

export function buildInitialLeadReviewPrompt(input: SlackConversationInput) {
  return `
You are reviewing a lead that came from Slack.

Return ONLY valid JSON inside a \`\`\`json\`\`\` fenced code block with this exact shape:
{
  "verdict": "Strong fit | Possible fit | Weak fit | Needs human review",
  "whyPromising": ["..."],
  "risks": ["..."],
  "missingInformation": ["..."],
  "recommendedNextStep": "...",
  "confidence": "High | Medium | Low"
}

Rules:
- Use evidence first and clearly mark uncertainty
- Keep every bullet short and operational
- If the lead text is sparse, say what is missing instead of pretending certainty
- Do not propose external outreach or system writes as already done

Lead context:
- Trigger type: ${input.triggerType}
- Slack channel id: ${input.channelId}
- Slack thread ts: ${input.threadTs}
- Submitted by user: ${input.triggerUserId}
- Source message:
${input.sourceText}
  `.trim();
}

export function buildFollowUpPrompt(userMessage: string) {
  return `
Answer the user's follow-up in a concise Slack-friendly way.

If the user is asking for a refreshed verdict, return the same JSON format as before.
If the user is asking a normal follow-up question, answer in short markdown bullets.

User follow-up:
${userMessage}
  `.trim();
}
