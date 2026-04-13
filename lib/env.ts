const required = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const env = {
  anthropicApiKey: () => required(process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY"),
  anthropicAgentId: () => required(process.env.ANTHROPIC_AGENT_ID, "ANTHROPIC_AGENT_ID"),
  anthropicEnvironmentId: () =>
    required(process.env.ANTHROPIC_ENVIRONMENT_ID, "ANTHROPIC_ENVIRONMENT_ID"),
  slackBotToken: () => required(process.env.SLACK_BOT_TOKEN, "SLACK_BOT_TOKEN"),
  slackSigningSecret: () =>
    required(process.env.SLACK_SIGNING_SECRET, "SLACK_SIGNING_SECRET"),
  slackVerificationToken: () => process.env.SLACK_VERIFICATION_TOKEN,
  skipSlackSignatureVerification: () => process.env.SLACK_SKIP_SIGNATURE_VERIFICATION === "true",
  appBaseUrl: () => required(process.env.APP_BASE_URL, "APP_BASE_URL"),
};
