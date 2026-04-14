const normalizeSecret = (value: string | undefined) => {
  if (!value) {
    return value;
  }

  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
};

const required = (value: string | undefined, name: string) => {
  const normalized = normalizeSecret(value);

  if (!normalized) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return normalized;
};

export const env = {
  anthropicApiKey: () => required(process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY"),
  anthropicAgentId: () => required(process.env.ANTHROPIC_AGENT_ID, "ANTHROPIC_AGENT_ID"),
  anthropicEnvironmentId: () =>
    required(process.env.ANTHROPIC_ENVIRONMENT_ID, "ANTHROPIC_ENVIRONMENT_ID"),
  slackBotToken: () => required(process.env.SLACK_BOT_TOKEN, "SLACK_BOT_TOKEN"),
  slackSigningSecret: () =>
    required(process.env.SLACK_SIGNING_SECRET, "SLACK_SIGNING_SECRET"),
  slackVerificationToken: () => normalizeSecret(process.env.SLACK_VERIFICATION_TOKEN),
  skipSlackSignatureVerification: () => process.env.SLACK_SKIP_SIGNATURE_VERIFICATION === "true",
  appBaseUrl: () => required(process.env.APP_BASE_URL, "APP_BASE_URL"),
};
