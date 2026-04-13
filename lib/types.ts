export type SlackConversationInput = {
  channelId: string;
  threadTs: string;
  sourceMessageTs: string;
  sourceText: string;
  triggerUserId: string;
  triggerType: "app_mention" | "message_shortcut" | "dm" | "assistant";
};

export type AssistantThreadInput = {
  channelId: string;
  threadTs: string;
  userId: string;
  context: {
    channelId?: string;
    teamId?: string;
    enterpriseId?: string | null;
  };
};

export type SlackReplyEvent = {
  text: string;
  userId: string;
};

export type LeadReviewResult = {
  verdict: string;
  whyPromising: string[];
  risks: string[];
  missingInformation: string[];
  recommendedNextStep: string;
  confidence: string;
  rawText: string;
};
