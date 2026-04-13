export function getAssistantSuggestedPrompts() {
  return [
    {
      title: "Review pasted lead",
      message:
        "Review this lead. Give me verdict, promising signals, risks, missing info, and next step.",
    },
    {
      title: "Enrich company",
      message: "Enrich this company and summarize what matters for lead qualification.",
    },
    {
      title: "Draft follow-up questions",
      message: "What questions should I ask next to qualify this lead better?",
    },
    {
      title: "Re-score lead",
      message: "Re-evaluate this lead with a fresh verdict and confidence level.",
    },
  ];
}
