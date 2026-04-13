import type { LeadReviewResult } from "@/lib/types";

const pickBulletList = (heading: string, items: string[]) => {
  if (!items.length) {
    return `${heading}\n- None identified`;
  }

  return `${heading}\n${items.map((item) => `- ${item}`).join("\n")}`;
};

export function formatLeadReview(result: LeadReviewResult) {
  return [
    `*Verdict:* ${result.verdict}`,
    "",
    pickBulletList("Why it looks promising", result.whyPromising),
    "",
    pickBulletList("Risks / concerns", result.risks),
    "",
    pickBulletList("Missing information", result.missingInformation),
    "",
    `*Recommended next step:* ${result.recommendedNextStep}`,
    `*Confidence:* ${result.confidence}`,
  ].join("\n");
}
