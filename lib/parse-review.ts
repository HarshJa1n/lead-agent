import { z } from "zod";

import type { LeadReviewResult } from "@/lib/types";

const reviewSchema = z.object({
  verdict: z.string(),
  whyPromising: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
  recommendedNextStep: z.string(),
  confidence: z.string(),
});

const extractJsonBlock = (text: string) => {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return null;
};

export function parseLeadReview(text: string): LeadReviewResult {
  const jsonBlock = extractJsonBlock(text);

  if (!jsonBlock) {
    return {
      verdict: "Review completed",
      whyPromising: [],
      risks: [],
      missingInformation: [],
      recommendedNextStep: "Open the raw response and review details manually.",
      confidence: "Unknown",
      rawText: text,
    };
  }

  try {
    const parsed = reviewSchema.parse(JSON.parse(jsonBlock));

    return {
      ...parsed,
      rawText: text,
    };
  } catch {
    return {
      verdict: "Review completed",
      whyPromising: [],
      risks: [],
      missingInformation: [],
      recommendedNextStep: "Open the raw response and review details manually.",
      confidence: "Unknown",
      rawText: text,
    };
  }
}
