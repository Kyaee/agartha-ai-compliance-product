// Compliance checking service

import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import { buildSystemPrompt, buildImageAnalysisPromptWithSightEngine, type SightEngineModerationData } from "../constants/prompts";
import { SEVERITY_CONFIG } from "../constants/policies";
import type {
  ComplianceReport,
  ImageViolation,
  Platform,
  ProductCategory,
  Violation,
  SightEngineResult,
} from "../types";

export interface TextAnalysisResult {
  violations: Violation[];
  missingDisclaimers: Omit<Violation, "offendingText" | "startIndex" | "endIndex">[];
  recommendations: string[];
}

interface ImageAnalysisResult {
  imageViolations: ImageViolation[];
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
  imageSource: string,
  platform: Platform,
  apiKey: string,
  sightEngineData?: SightEngineModerationData
): Promise<ImageAnalysisResult> {
  const openai = new OpenAI({ apiKey });

  // Build prompt with SightEngine context if available
  const systemPrompt = buildImageAnalysisPromptWithSightEngine(platform, sightEngineData);

  // Determine the image URL format
  // OpenAI accepts: http/https URLs directly, or data: URLs for base64
  let imageUrl: string;
  if (imageSource.startsWith("http://") || imageSource.startsWith("https://")) {
    // Direct URL - OpenAI can fetch it
    imageUrl = imageSource;
  } else if (imageSource.startsWith("data:")) {
    // Already a data URL
    imageUrl = imageSource;
  } else {
    // Raw base64 - wrap in data URL
    imageUrl = `data:image/jpeg;base64,${imageSource}`;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Please analyze this healthcare advertising image for compliance issues.${sightEngineData ? " SightEngine pre-scan results are provided in the system prompt - use them to inform your analysis." : ""}`,
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
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
  imageViolations: ImageViolation[] = [],
  imageTextViolations: Violation[] = []
): { score: number; status: "pass" | "fail" | "review" } {
  let score = 100;

  // Combine all violations for scoring
  const allViolations = [
    ...textViolations,
    ...imageViolations,
    ...imageTextViolations,
  ];

  // Deduct points for ALL violations
  for (const violation of allViolations) {
    const config = SEVERITY_CONFIG[violation.severity];
    score -= config.weight * violation.confidence;
  }

  // Ensure score stays in 0-100 range
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine status based on ALL violations
  const hasCritical = allViolations.some((v) => v.severity === "critical");
  const hasWarning = allViolations.some((v) => v.severity === "warning");

  let status: "pass" | "fail" | "review";
  if (hasCritical || score < 60) {
    status = "fail";
  } else if (hasWarning || score < 80) {
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
  imageUrl?: string,
  sightEngineResult?: SightEngineResult,
  imageTextAnalysis?: TextAnalysisResult,
  extractedImageText?: string
): ComplianceReport {
  // Combine violations and missing disclaimers from main text analysis
  const allTextViolations: Violation[] = [
    ...textAnalysis.violations,
    ...textAnalysis.missingDisclaimers.map((d) => ({
      ...d,
      offendingText: undefined,
      startIndex: undefined,
      endIndex: undefined,
    })),
  ];

  // Combine GPT image violations with SightEngine violations
  const gptImageViolations = imageAnalysis?.imageViolations || [];
  const sightEngineViolations = sightEngineResult?.violations || [];
  const imageViolations = [...gptImageViolations, ...sightEngineViolations];

  // Process image text violations (from OCR)
  const imageTextViolations: Violation[] = imageTextAnalysis ? [
    ...imageTextAnalysis.violations.map(v => ({
      ...v,
      category: `Image Text: ${v.category}`,
    })),
    ...imageTextAnalysis.missingDisclaimers.map((d) => ({
      ...d,
      category: `Image Text: ${d.category}`,
      offendingText: undefined,
      startIndex: undefined,
      endIndex: undefined,
    })),
  ] : [];

  const { score, status } = calculateComplianceScore(allTextViolations, imageViolations, imageTextViolations);

  // Combine recommendations
  const recommendations = [
    ...textAnalysis.recommendations,
    ...(imageAnalysis?.imageRecommendations || []),
    ...(imageTextAnalysis?.recommendations || []),
  ];

  // Add SightEngine-specific recommendations
  if (sightEngineResult && sightEngineResult.overallSafetyScore < 80) {
    recommendations.push(
      "Image moderation detected potential issues. Review the image safety scores and consider using alternative imagery."
    );
  }

  // Add OCR-specific recommendations
  if (extractedImageText && imageTextViolations.length > 0) {
    recommendations.push(
      "Text detected in the image contains compliance issues. Review and update the image text to meet advertising guidelines."
    );
  }

  // Generate summary based on analysis results
  const totalIssues = allTextViolations.length + imageViolations.length + imageTextViolations.length;
  const allViolations = [...allTextViolations, ...imageViolations, ...imageTextViolations];
  const criticalCount = allViolations.filter(v => v.severity === "critical").length;
  const warningCount = allViolations.filter(v => v.severity === "warning").length;
  
  let summary: string;
  if (totalIssues === 0) {
    summary = "No compliance issues detected. Your content appears to meet platform advertising guidelines.";
  } else {
    const parts: string[] = [];
    if (criticalCount > 0) {
      parts.push(`${criticalCount} critical issue${criticalCount > 1 ? "s" : ""}`);
    }
    if (warningCount > 0) {
      parts.push(`${warningCount} warning${warningCount > 1 ? "s" : ""}`);
    }
    const infoCount = totalIssues - criticalCount - warningCount;
    if (infoCount > 0) {
      parts.push(`${infoCount} info item${infoCount > 1 ? "s" : ""}`);
    }
    summary = `Analysis found ${parts.join(", ")}. Review the violations below and apply suggested fixes before publishing.`;
  }

  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    overallScore: score,
    status,
    textViolations: allTextViolations,
    imageViolations,
    imageTextViolations: imageTextViolations.length > 0 ? imageTextViolations : undefined,
    platform,
    productCategory,
    originalText,
    imageUrl,
    extractedImageText: extractedImageText || undefined,
    summary,
    recommendations,
    imageModerationScores: sightEngineResult?.moderationScores,
    imageSafetyScore: sightEngineResult?.overallSafetyScore,
    hasProfanity: sightEngineResult?.hasProfanity,
    profanityMatches: sightEngineResult?.profanityMatches,
  };
}

