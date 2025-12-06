// SightEngine Image Moderation Service

import { v4 as uuidv4 } from "uuid";
import type { ImageViolation, Severity, SightEngineResult, SightEngineModerationScores } from "../types";

const SIGHTENGINE_API_USER = "131469647";
const SIGHTENGINE_API_SECRET = "Gekneb7LHkzWrD5mof3gbDmdhuyLCWjD";
const SIGHTENGINE_BASE_URL = "https://api.sightengine.com/1.0/check.json";

// Models to check - including text-content for OCR and offensive-2.0 for offensive content
const MODELS = "nudity-2.1,recreational_drug,medical,gore-2.0,qr-content,genai,violence,self-harm,text-content,offensive-2.0";

// Thresholds for different categories
const THRESHOLDS = {
  nudity: {
    sexual_activity: { critical: 0.5, warning: 0.3 },
    sexual_display: { critical: 0.5, warning: 0.3 },
    erotica: { critical: 0.4, warning: 0.2 },
    very_suggestive: { critical: 0.6, warning: 0.4 },
    suggestive: { critical: 0.7, warning: 0.5 },
  },
  recreational_drug: { critical: 0.5, warning: 0.3 },
  medical: { critical: 0.7, warning: 0.5 },
  gore: { critical: 0.3, warning: 0.1 },
  violence: { critical: 0.5, warning: 0.3 },
  self_harm: { critical: 0.3, warning: 0.1 },
  genai: { warning: 0.7 }, // AI-generated content detection
  offensive: { critical: 0.5, warning: 0.3 }, // Offensive content detection
};

interface SightEngineApiResponse {
  status: string;
  request?: {
    id: string;
  };
  nudity?: {
    sexual_activity: number;
    sexual_display: number;
    erotica: number;
    very_suggestive: number;
    suggestive: number;
    mildly_suggestive: number;
    none: number;
  };
  recreational_drug?: {
    prob: number;
  };
  medical?: {
    prob: number;
    is_medical: boolean;
  };
  gore?: {
    prob: number;
  };
  violence?: {
    prob: number;
  };
  self_harm?: {
    prob: number;
  };
  // AI-generated detection is returned under "type" field, not "genai"
  type?: {
    ai_generated: number;
  };
  qr_content?: {
    type?: string;
    link?: string;
  };
  // Offensive content detection
  offensive?: {
    prob: number;
    nazi?: number;
    confederate?: number;
    supremacist?: number;
    terrorist?: number;
    middle_finger?: number;
  };
  // Text content detection (OCR)
  text?: {
    has_artificial?: number;
    has_natural?: number;
    profanity?: Array<{
      type: string;
      match: string;
    }>;
    personal?: Array<{
      type: string;
      match: string;
    }>;
    link?: Array<{
      type: string;
      match: string;
    }>;
    social?: Array<{
      type: string;
      match: string;
    }>;
    // Extracted text from the image
    words?: string[];
  };
  error?: {
    message: string;
    code: number;
  };
}

/**
 * Analyze an image by URL using SightEngine API (GET request)
 * Use this when you have a publicly accessible image URL
 */
export async function analyzeImageByUrl(
  imageUrl: string
): Promise<SightEngineResult> {
  const params = new URLSearchParams({
    url: imageUrl,
    models: MODELS,
    api_user: SIGHTENGINE_API_USER,
    api_secret: SIGHTENGINE_API_SECRET,
  });
  
  const response = await fetch(`${SIGHTENGINE_BASE_URL}?${params.toString()}`, {
    method: "GET",
  });
  
  if (!response.ok) {
    throw new Error(`SightEngine API error: ${response.status}`);
  }
  
  const data: SightEngineApiResponse = await response.json();
  
  // Debug: Log the full SightEngine response
  console.log("[SightEngine URL] Full response:", JSON.stringify(data, null, 2));
  
  if (data.status === "failure" && data.error) {
    throw new Error(`SightEngine error: ${data.error.message}`);
  }
  
  return parseSightEngineResponse(data);
}

/**
 * Analyze an uploaded image using SightEngine API (POST request)
 * Use this when you have a base64 encoded image from file upload
 */
export async function analyzeImageByUpload(
  imageBase64: string
): Promise<SightEngineResult> {
  // Extract base64 data (remove data URL prefix if present)
  const base64Data = imageBase64.includes(",") 
    ? imageBase64.split(",")[1] 
    : imageBase64;
  
  // Detect mime type from data URL prefix
  let mimeType = "image/jpeg";
  if (imageBase64.startsWith("data:")) {
    const mimeMatch = imageBase64.match(/data:([^;]+);/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }
  }
  
  // Convert base64 to blob
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const extension = mimeType.split("/")[1] || "jpg";
  const blob = new Blob([byteArray], { type: mimeType });
  
  // Create form data for POST request
  const formData = new FormData();
  formData.append("media", blob, `image.${extension}`);
  formData.append("models", MODELS);
  formData.append("api_user", SIGHTENGINE_API_USER);
  formData.append("api_secret", SIGHTENGINE_API_SECRET);
  
  const response = await fetch("https://api.sightengine.com/1.0/check.json", {
    method: "POST",
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`SightEngine API error: ${response.status}`);
  }
  
  const data: SightEngineApiResponse = await response.json();
  
  // Debug: Log the full SightEngine response
  console.log("[SightEngine Upload] Full response:", JSON.stringify(data, null, 2));
  
  if (data.status === "failure" && data.error) {
    throw new Error(`SightEngine error: ${data.error.message}`);
  }
  
  return parseSightEngineResponse(data);
}

/**
 * Analyze an image using SightEngine API
 * Automatically determines whether to use URL or upload method
 * @param imageSource - Either a URL string or base64 encoded image
 */
export async function analyzeImageWithSightEngine(
  imageSource: string
): Promise<SightEngineResult> {
  const isBase64 = imageSource.startsWith("data:");
  
  if (isBase64) {
    return analyzeImageByUpload(imageSource);
  } else {
    return analyzeImageByUrl(imageSource);
  }
}

/**
 * Parse SightEngine API response into our format
 */
function parseSightEngineResponse(response: SightEngineApiResponse): SightEngineResult {
  const moderationScores: SightEngineModerationScores = {
    nudity: {
      sexual_activity: response.nudity?.sexual_activity ?? 0,
      sexual_display: response.nudity?.sexual_display ?? 0,
      erotica: response.nudity?.erotica ?? 0,
      very_suggestive: response.nudity?.very_suggestive ?? 0,
      suggestive: response.nudity?.suggestive ?? 0,
      none: response.nudity?.none ?? 1,
    },
    recreational_drug: response.recreational_drug?.prob ?? 0,
    medical: response.medical?.prob ?? 0,
    gore: response.gore?.prob ?? 0,
    violence: response.violence?.prob ?? 0,
    self_harm: response.self_harm?.prob ?? 0,
    ai_generated: response.type?.ai_generated ?? 0,
    offensive: response.offensive?.prob ?? 0,
  };
  
  const violations = generateViolationsFromScores(moderationScores, response);
  const overallSafetyScore = calculateOverallSafetyScore(moderationScores);
  
  // Extract text from image if available
  const extractedText = response.text?.words?.join(" ") || "";
  const hasProfanity = (response.text?.profanity?.length ?? 0) > 0;
  
  return {
    requestId: response.request?.id || uuidv4(),
    moderationScores,
    violations,
    overallSafetyScore,
    extractedText: extractedText.trim(),
    hasProfanity,
    profanityMatches: response.text?.profanity?.map(p => p.match) || [],
    raw: response,
  };
}

/**
 * Generate violations based on moderation scores
 */
function generateViolationsFromScores(scores: SightEngineModerationScores, response?: SightEngineApiResponse): ImageViolation[] {
  const violations: ImageViolation[] = [];
  
  // Check nudity categories
  const nudityChecks = [
    { key: "sexual_activity", score: scores.nudity.sexual_activity, label: "Sexual Activity" },
    { key: "sexual_display", score: scores.nudity.sexual_display, label: "Sexual Display" },
    { key: "erotica", score: scores.nudity.erotica, label: "Erotica" },
    { key: "very_suggestive", score: scores.nudity.very_suggestive, label: "Very Suggestive Content" },
    { key: "suggestive", score: scores.nudity.suggestive, label: "Suggestive Content" },
  ];
  
  for (const check of nudityChecks) {
    const thresholds = THRESHOLDS.nudity[check.key as keyof typeof THRESHOLDS.nudity];
    if (check.score >= thresholds.critical) {
      violations.push(createNudityViolation(check.label, check.score, "critical"));
    } else if (check.score >= thresholds.warning) {
      violations.push(createNudityViolation(check.label, check.score, "warning"));
    }
  }
  
  // Check recreational drugs
  if (scores.recreational_drug >= THRESHOLDS.recreational_drug.critical) {
    violations.push(createDrugViolation(scores.recreational_drug, "critical"));
  } else if (scores.recreational_drug >= THRESHOLDS.recreational_drug.warning) {
    violations.push(createDrugViolation(scores.recreational_drug, "warning"));
  }
  
  // Check gore
  if (scores.gore >= THRESHOLDS.gore.critical) {
    violations.push(createGoreViolation(scores.gore, "critical"));
  } else if (scores.gore >= THRESHOLDS.gore.warning) {
    violations.push(createGoreViolation(scores.gore, "warning"));
  }
  
  // Check violence
  if (scores.violence >= THRESHOLDS.violence.critical) {
    violations.push(createViolenceViolation(scores.violence, "critical"));
  } else if (scores.violence >= THRESHOLDS.violence.warning) {
    violations.push(createViolenceViolation(scores.violence, "warning"));
  }
  
  // Check self-harm
  if (scores.self_harm >= THRESHOLDS.self_harm.critical) {
    violations.push(createSelfHarmViolation(scores.self_harm, "critical"));
  } else if (scores.self_harm >= THRESHOLDS.self_harm.warning) {
    violations.push(createSelfHarmViolation(scores.self_harm, "warning"));
  }
  
  // Check AI-generated content (info level)
  if (scores.ai_generated >= THRESHOLDS.genai.warning) {
    violations.push(createAIGeneratedViolation(scores.ai_generated));
  }
  
  // Check offensive content
  if (scores.offensive >= THRESHOLDS.offensive.critical) {
    violations.push(createOffensiveViolation(scores.offensive, "critical", response?.offensive));
  } else if (scores.offensive >= THRESHOLDS.offensive.warning) {
    violations.push(createOffensiveViolation(scores.offensive, "warning", response?.offensive));
  }
  
  // Check for profanity in image text
  if (response?.text?.profanity && response.text.profanity.length > 0) {
    violations.push(createProfanityViolation(response.text.profanity));
  }
  
  return violations;
}

function createNudityViolation(label: string, score: number, severity: Severity): ImageViolation {
  return {
    id: uuidv4(),
    severity,
    category: "Inappropriate Content",
    policyReference: "Policy 3.1 – Prohibited Nudity/Sexual Content",
    policyDescription: `Image contains ${label.toLowerCase()} (${Math.round(score * 100)}% confidence). This violates platform advertising policies that prohibit sexually suggestive or explicit content.`,
    suggestedFix: "Replace the image with appropriate, non-suggestive content that focuses on the product benefits without sexual undertones.",
    confidence: score,
    imageIssueType: "nudity",
  };
}

function createDrugViolation(score: number, severity: Severity): ImageViolation {
  return {
    id: uuidv4(),
    severity,
    category: "Drug-Related Content",
    policyReference: "Policy 4.5 – Recreational Drug Imagery",
    policyDescription: `Image may contain recreational drug-related content (${Math.round(score * 100)}% confidence). This is prohibited on all major advertising platforms.`,
    suggestedFix: "Remove any drug paraphernalia or substances from the image. Use clean, professional imagery that focuses on legitimate health benefits.",
    confidence: score,
    imageIssueType: "graphic_content",
  };
}

function createGoreViolation(score: number, severity: Severity): ImageViolation {
  return {
    id: uuidv4(),
    severity,
    category: "Graphic Content",
    policyReference: "Policy 3.4 – Gore/Graphic Imagery",
    policyDescription: `Image contains graphic or gory content (${Math.round(score * 100)}% confidence). This violates platform policies against shocking or disturbing imagery.`,
    suggestedFix: "Replace with non-graphic imagery. For medical products, use illustrations or diagrams instead of realistic graphic imagery.",
    confidence: score,
    imageIssueType: "graphic_content",
  };
}

function createViolenceViolation(score: number, severity: Severity): ImageViolation {
  return {
    id: uuidv4(),
    severity,
    category: "Violent Content",
    policyReference: "Policy 3.3 – Violence Depiction",
    policyDescription: `Image may contain violent content (${Math.round(score * 100)}% confidence). Violent imagery is prohibited in advertising.`,
    suggestedFix: "Remove violent elements from the image. Focus on positive, constructive messaging and imagery.",
    confidence: score,
    imageIssueType: "graphic_content",
  };
}

function createSelfHarmViolation(score: number, severity: Severity): ImageViolation {
  return {
    id: uuidv4(),
    severity,
    category: "Self-Harm Content",
    policyReference: "Policy 3.5 – Self-Harm Imagery",
    policyDescription: `Image may contain self-harm related content (${Math.round(score * 100)}% confidence). This content is strictly prohibited.`,
    suggestedFix: "Replace with imagery that promotes positive health outcomes. Consider using supportive, recovery-focused visuals.",
    confidence: score,
    imageIssueType: "graphic_content",
  };
}

function createAIGeneratedViolation(score: number): ImageViolation {
  return {
    id: uuidv4(),
    severity: "info",
    category: "AI-Generated Content",
    policyReference: "Policy 5.1 – AI-Generated Imagery Disclosure",
    policyDescription: `Image appears to be AI-generated (${Math.round(score * 100)}% confidence). Some platforms require disclosure of AI-generated content.`,
    suggestedFix: "Consider adding a disclosure that the image is AI-generated, or use authentic photography where appropriate.",
    confidence: score,
    imageIssueType: "misleading_imagery",
  };
}

function createOffensiveViolation(score: number, severity: Severity, details?: { nazi?: number; confederate?: number; supremacist?: number; terrorist?: number; middle_finger?: number }): ImageViolation {
  // Determine specific offensive content types
  const offensiveTypes: string[] = [];
  if (details?.nazi && details.nazi > 0.3) offensiveTypes.push("nazi symbolism");
  if (details?.confederate && details.confederate > 0.3) offensiveTypes.push("confederate imagery");
  if (details?.supremacist && details.supremacist > 0.3) offensiveTypes.push("supremacist content");
  if (details?.terrorist && details.terrorist > 0.3) offensiveTypes.push("terrorist-related content");
  if (details?.middle_finger && details.middle_finger > 0.3) offensiveTypes.push("obscene gestures");
  
  const typeDescription = offensiveTypes.length > 0 
    ? ` Detected: ${offensiveTypes.join(", ")}.` 
    : "";
  
  return {
    id: uuidv4(),
    severity,
    category: "Offensive Content",
    policyReference: "Policy 3.6 – Offensive/Hateful Imagery",
    policyDescription: `Image contains offensive content (${Math.round(score * 100)}% confidence).${typeDescription} This violates platform policies against hateful or offensive imagery.`,
    suggestedFix: "Remove all offensive symbols, gestures, or hateful imagery. Use inclusive, respectful visuals that align with advertising standards.",
    confidence: score,
    imageIssueType: "graphic_content",
  };
}

function createProfanityViolation(profanityMatches: Array<{ type: string; match: string }>): ImageViolation {
  const matches = profanityMatches.map(p => p.match).join(", ");
  return {
    id: uuidv4(),
    severity: "critical",
    category: "Profanity in Image Text",
    policyReference: "Policy 3.7 – Profane Language in Imagery",
    policyDescription: `Image contains text with profane language: "${matches}". Profanity in advertising images is strictly prohibited on all platforms.`,
    suggestedFix: "Remove or replace the profane text in the image. Ensure all visible text is appropriate for general audiences.",
    confidence: 1.0,
    imageIssueType: "graphic_content",
  };
}

/**
 * Calculate overall safety score (0-100, higher is safer)
 * If any critical category has a high risk score (>60%), the overall safety is capped below 40%
 */
function calculateOverallSafetyScore(scores: SightEngineModerationScores): number {
  // Get max nudity score
  const maxNudity = Math.max(
    scores.nudity.sexual_activity,
    scores.nudity.sexual_display,
    scores.nudity.erotica,
    scores.nudity.very_suggestive,
    scores.nudity.suggestive * 0.7 // Slightly lower weight for just suggestive
  );

  // All risk categories to check
  const riskCategories = [
    { score: maxNudity, label: "nudity" },
    { score: scores.gore, label: "gore" },
    { score: scores.self_harm, label: "self_harm" },
    { score: scores.recreational_drug, label: "drugs" },
    { score: scores.violence, label: "violence" },
    { score: scores.offensive, label: "offensive" },
  ];

  // Find the highest risk score across all categories
  const maxRiskScore = Math.max(...riskCategories.map(c => c.score));

  // Cap safety score based on worst category
  // If any risk is >= 60% (critically high), safety must be <= 39% (critically low)
  // If any risk is >= 40%, safety is capped at 59%
  // If any risk is >= 20%, safety is capped at 79%
  let safetyCap = 100;
  
  if (maxRiskScore >= 0.8) {
    // Extremely high risk (80%+) -> Max 15% safety
    safetyCap = 15;
  } else if (maxRiskScore >= 0.6) {
    // Critical risk (60%+) -> Max 39% safety (below 40% threshold)
    safetyCap = 39;
  } else if (maxRiskScore >= 0.4) {
    // High risk (40%+) -> Max 59% safety
    safetyCap = 59;
  } else if (maxRiskScore >= 0.2) {
    // Moderate risk (20%+) -> Max 79% safety
    safetyCap = 79;
  }

  // Weight the different categories for base score calculation
  const weights = {
    nudity: 0.2,
    drugs: 0.15,
    gore: 0.15,
    violence: 0.15,
    self_harm: 0.15,
    offensive: 0.15,
    ai: 0.05,
  };
  
  // Calculate weighted penalty
  const penalty =
    maxNudity * weights.nudity +
    scores.recreational_drug * weights.drugs +
    scores.gore * weights.gore +
    scores.violence * weights.violence +
    scores.self_harm * weights.self_harm +
    scores.offensive * weights.offensive +
    scores.ai_generated * weights.ai * 0.3; // Lower penalty for AI detection
  
  // Calculate base score
  const baseScore = Math.max(0, Math.round((1 - penalty) * 100));
  
  // Apply the cap - safety score cannot exceed the cap based on worst risk
  return Math.min(baseScore, safetyCap);
}

