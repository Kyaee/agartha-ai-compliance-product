// Compliance checking service

import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import { buildSystemPrompt, IMAGE_ANALYSIS_PROMPT } from "../constants/prompts";
import { SEVERITY_CONFIG } from "../constants/policies";
import type {
  ComplianceReport,
  ImageViolation,
  Platform,
  ProductCategory,
  Violation,
} from "../types";

interface TextAnalysisResult {
  violations: Violation[];
  missingDisclaimers: Omit<Violation, "offendingText" | "startIndex" | "endIndex">[];
  summary: string;
  recommendations: string[];
}

interface ImageAnalysisResult {
  imageViolations: ImageViolation[];
  imageSummary: string;
  imageRecommendations: string[];
}

export async function analyzeTextCompliance(
  text: string,
  platform: Platform,
  productCategory: ProductCategory,
  apiKey: string
): Promise<TextAnalysisResult> {
  const openai = new OpenAI({ apiKey });

  const systemPrompt = buildSystemPrompt(platform, productCategory);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Please analyze this healthcare marketing copy for compliance violations:\n\n"""${text}"""`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from compliance analysis");
  }

  const result = JSON.parse(content) as TextAnalysisResult;

  // Ensure all violations have IDs
  result.violations = result.violations.map((v) => ({
    ...v,
    id: v.id || uuidv4(),
  }));

  result.missingDisclaimers = result.missingDisclaimers.map((d) => ({
    ...d,
    id: d.id || uuidv4(),
  }));

  return result;
}

export async function analyzeImageCompliance(
  imageBase64: string,
  platform: Platform,
  apiKey: string
): Promise<ImageAnalysisResult> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: IMAGE_ANALYSIS_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Please analyze this healthcare advertising image for compliance issues. Platform: ${platform.toUpperCase()}`,
          },
          {
            type: "image_url",
            image_url: {
              url: imageBase64.startsWith("data:")
                ? imageBase64
                : `data:image/jpeg;base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from image analysis");
  }

  const result = JSON.parse(content) as ImageAnalysisResult;

  // Ensure all violations have IDs
  result.imageViolations = (result.imageViolations || []).map((v) => ({
    ...v,
    id: v.id || uuidv4(),
  }));

  return result;
}

export function calculateComplianceScore(
  textViolations: Violation[],
  imageViolations: ImageViolation[]
): { score: number; status: "pass" | "fail" | "review" } {
  let score = 100;

  // Deduct points for text violations
  for (const violation of textViolations) {
    const config = SEVERITY_CONFIG[violation.severity];
    score -= config.weight * violation.confidence;
  }

  // Deduct points for image violations
  for (const violation of imageViolations) {
    const config = SEVERITY_CONFIG[violation.severity];
    score -= config.weight * violation.confidence;
  }

  // Ensure score stays in 0-100 range
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine status
  let status: "pass" | "fail" | "review";
  const hasCritical =
    textViolations.some((v) => v.severity === "critical") ||
    imageViolations.some((v) => v.severity === "critical");

  if (hasCritical || score < 60) {
    status = "fail";
  } else if (score < 80) {
    status = "review";
  } else {
    status = "pass";
  }

  return { score, status };
}

export function generateComplianceReport(
  originalText: string,
  platform: Platform,
  productCategory: ProductCategory,
  textAnalysis: TextAnalysisResult,
  imageAnalysis?: ImageAnalysisResult,
  imageUrl?: string
): ComplianceReport {
  // Combine violations and missing disclaimers
  const allTextViolations: Violation[] = [
    ...textAnalysis.violations,
    ...textAnalysis.missingDisclaimers.map((d) => ({
      ...d,
      offendingText: undefined,
      startIndex: undefined,
      endIndex: undefined,
    })),
  ];

  const imageViolations = imageAnalysis?.imageViolations || [];

  const { score, status } = calculateComplianceScore(allTextViolations, imageViolations);

  // Combine recommendations
  const recommendations = [
    ...textAnalysis.recommendations,
    ...(imageAnalysis?.imageRecommendations || []),
  ];

  // Build summary
  let summary = textAnalysis.summary;
  if (imageAnalysis?.imageSummary) {
    summary += ` ${imageAnalysis.imageSummary}`;
  }

  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    overallScore: score,
    status,
    textViolations: allTextViolations,
    imageViolations,
    platform,
    productCategory,
    originalText,
    imageUrl,
    summary,
    recommendations,
  };
}

