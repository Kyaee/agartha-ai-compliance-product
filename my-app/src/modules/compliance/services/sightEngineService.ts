// SightEngine Image Moderation Service

import { v4 as uuidv4 } from "uuid";
import type { ImageViolation, Severity, SightEngineResult, SightEngineModerationScores } from "../types";

const SIGHTENGINE_API_USER = "131469647";
const SIGHTENGINE_API_SECRET = "Gekneb7LHkzWrD5mof3gbDmdhuyLCWjD";
const SIGHTENGINE_BASE_URL = "https://api.sightengine.com/1.0/check.json";

// Models to check
const MODELS = "nudity-2.1,recreational_drug,medical,gore-2.0,qr-content,genai,violence,self-harm";

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
  genai?: {
    ai_generated: number;
  };
  qr_content?: {
    type?: string;
    link?: string;
  };
  error?: {
    message: string;
    code: number;
  };
}

/**
 * Analyze an image using SightEngine API
 * Supports both URL and base64 encoded images
 */
export async function analyzeImageWithSightEngine(
  imageSource: string
): Promise<SightEngineResult> {
  const isBase64 = imageSource.startsWith("data:");
  
  let response: Response;
  
  if (isBase64) {
    // For base64 images, use POST with form data
    const base64Data = imageSource.split(",")[1] || imageSource;
    const formData = new FormData();
    
    // Convert base64 to blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/jpeg" });
    
    formData.append("media", blob, "image.jpg");
    formData.append("models", MODELS);
    formData.append("api_user", SIGHTENGINE_API_USER);
    formData.append("api_secret", SIGHTENGINE_API_SECRET);
    
    response = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: formData,
    });
  } else {
    // For URL images, use GET
    const params = new URLSearchParams({
      url: imageSource,
      models: MODELS,
      api_user: SIGHTENGINE_API_USER,
      api_secret: SIGHTENGINE_API_SECRET,
    });
    
    response = await fetch(`${SIGHTENGINE_BASE_URL}?${params.toString()}`);
  }
  
  if (!response.ok) {
    throw new Error(`SightEngine API error: ${response.status}`);
  }
  
  const data: SightEngineApiResponse = await response.json();
  
  if (data.status === "failure" && data.error) {
    throw new Error(`SightEngine error: ${data.error.message}`);
  }
  
  return parseSightEngineResponse(data);
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
    ai_generated: response.genai?.ai_generated ?? 0,
  };
  
  const violations = generateViolationsFromScores(moderationScores);
  const overallSafetyScore = calculateOverallSafetyScore(moderationScores);
  
  return {
    requestId: response.request?.id || uuidv4(),
    moderationScores,
    violations,
    overallSafetyScore,
    raw: response,
  };
}

/**
 * Generate violations based on moderation scores
 */
function generateViolationsFromScores(scores: SightEngineModerationScores): ImageViolation[] {
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

/**
 * Calculate overall safety score (0-100, higher is safer)
 */
function calculateOverallSafetyScore(scores: SightEngineModerationScores): number {
  // Weight the different categories
  const weights = {
    nudity: 0.25,
    drugs: 0.15,
    gore: 0.2,
    violence: 0.15,
    self_harm: 0.2,
    ai: 0.05,
  };
  
  // Get max nudity score
  const maxNudity = Math.max(
    scores.nudity.sexual_activity,
    scores.nudity.sexual_display,
    scores.nudity.erotica,
    scores.nudity.very_suggestive,
    scores.nudity.suggestive * 0.7 // Slightly lower weight for just suggestive
  );
  
  // Calculate weighted penalty
  const penalty =
    maxNudity * weights.nudity +
    scores.recreational_drug * weights.drugs +
    scores.gore * weights.gore +
    scores.violence * weights.violence +
    scores.self_harm * weights.self_harm +
    scores.ai_generated * weights.ai * 0.3; // Lower penalty for AI detection
  
  // Convert to 0-100 score (100 = completely safe)
  return Math.max(0, Math.round((1 - penalty) * 100));
}

