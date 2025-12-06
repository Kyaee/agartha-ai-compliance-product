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
    classes?: {
      cannabis?: number;
      cannabis_logo_only?: number;
      cannabis_plant?: number;
      cannabis_drug?: number;
      recreational_drugs_not_cannabis?: number;
    };
  };
  medical?: {
    prob: number;
    classes?: {
      pills?: number;
      paraphernalia?: number;
    };
  };
  gore?: {
    prob: number;
    classes?: Record<string, number>;
    type?: {
      animated?: number;
      fake?: number;
      real?: number;
    };
  };
  violence?: {
    prob: number;
    classes?: {
      physical_violence?: number;
      firearm_threat?: number;
      combat_sport?: number;
    };
  };
  // Note: API returns "self-harm" with hyphen!
  "self-harm"?: {
    prob: number;
    type?: {
      real?: number;
      fake?: number;
      animated?: number;
    };
  };
  // AI-generated detection is returned under "type" field
  type?: {
    ai_generated: number;
  };
  // QR code detection
  qr?: {
    personal?: Array<{ type: string; match: string }>;
    link?: Array<{ type: string; match: string }>;
    social?: Array<{ type: string; match: string }>;
    spam?: Array<{ type: string; match: string }>;
    profanity?: Array<{ type: string; match: string }>;
    blacklist?: Array<{ type: string; match: string }>;
  };
  // Offensive content detection - no "prob" field, individual scores directly!
  offensive?: {
    nazi: number;
    asian_swastika?: number;
    confederate: number;
    supremacist: number;
    terrorist: number;
    middle_finger: number;
  };
  // Text content detection (OCR) - arrays of detections, no "words" field!
  text?: {
    profanity?: Array<{ type: string; match: string }>;
    personal?: Array<{ type: string; match: string }>;
    link?: Array<{ type: string; match: string }>;
    social?: Array<{ type: string; match: string }>;
    extremism?: Array<{ type: string; match: string }>;
    medical?: Array<{ type: string; match: string }>;
    drug?: Array<{ type: string; match: string }>;
    weapon?: Array<{ type: string; match: string }>;
    "content-trade"?: Array<{ type: string; match: string }>;
    "money-transaction"?: Array<{ type: string; match: string }>;
    spam?: Array<{ type: string; match: string }>;
    violence?: Array<{ type: string; match: string }>;
    "self-harm"?: Array<{ type: string; match: string }>;
  };
  media?: {
    id: string;
    uri: string;
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
  
  // Log text detection specifically  
  if (data.text) {
    console.log("[SightEngine URL] Text detection results:");
    console.log("  - Profanity:", data.text.profanity);
    console.log("  - Violence text:", data.text.violence);
    console.log("  - Self-harm text:", data.text["self-harm"]);
  } else {
    console.log("[SightEngine URL] No text detection in response");
  }
  
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
  
  // Log text detection specifically
  if (data.text) {
    console.log("[SightEngine Upload] Text detection results:");
    console.log("  - Profanity:", data.text.profanity);
    console.log("  - Violence text:", data.text.violence);
    console.log("  - Self-harm text:", data.text["self-harm"]);
  } else {
    console.log("[SightEngine Upload] No text detection in response");
  }
  
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
 * Calculate max offensive score from individual category scores
 */
function getMaxOffensiveScore(offensive?: SightEngineApiResponse["offensive"]): number {
  if (!offensive) return 0;
  return Math.max(
    offensive.nazi ?? 0,
    offensive.asian_swastika ?? 0,
    offensive.confederate ?? 0,
    offensive.supremacist ?? 0,
    offensive.terrorist ?? 0,
    offensive.middle_finger ?? 0
  );
}

/**
 * Extract flagged text matches from all text detection categories
 * These are specific problematic text items detected by SightEngine (not general OCR)
 */
function extractFlaggedTextFromDetections(text?: SightEngineApiResponse["text"]): string[] {
  if (!text) return [];
  
  const allMatches: string[] = [];
  
  // Collect all detected text strings from various categories
  const categories = [
    text.profanity,
    text.personal,
    text.link,
    text.social,
    text.extremism,
    text.medical,
    text.drug,
    text.weapon,
    text["content-trade"],
    text["money-transaction"],
    text.spam,
    text.violence,
    text["self-harm"],
  ];
  
  for (const category of categories) {
    if (category && Array.isArray(category)) {
      for (const item of category) {
        if (item.match) {
          allMatches.push(item.match);
        }
      }
    }
  }
  
  return allMatches;
}

/**
 * Parse SightEngine API response into our format
 */
function parseSightEngineResponse(response: SightEngineApiResponse): SightEngineResult {
  // Access self-harm with hyphen (API uses hyphen, not underscore)
  const selfHarmData = response["self-harm"];
  
  // Calculate offensive score as max of individual categories
  const offensiveScore = getMaxOffensiveScore(response.offensive);
  
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
    self_harm: selfHarmData?.prob ?? 0,
    ai_generated: response.type?.ai_generated ?? 0,
    offensive: offensiveScore,
  };
  
  const violations = generateViolationsFromScores(moderationScores, response);
  const overallSafetyScore = calculateOverallSafetyScore(moderationScores);
  
  // Extract flagged text matches from image (these are specific problematic text items, not general OCR)
  const flaggedTextMatches = extractFlaggedTextFromDetections(response.text);
  const extractedText = flaggedTextMatches.join(" ");
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
  
  // Check for personal information in image text (PII)
  if (response?.text?.personal && response.text.personal.length > 0) {
    violations.push(createTextIssueViolation("personal_info", response.text.personal));
  }
  
  // Check for external links in image
  if (response?.text?.link && response.text.link.length > 0) {
    violations.push(createTextIssueViolation("link", response.text.link));
  }
  
  // Check for social media handles in image
  if (response?.text?.social && response.text.social.length > 0) {
    violations.push(createTextIssueViolation("social", response.text.social));
  }
  
  // Check for extremism text
  if (response?.text?.extremism && response.text.extremism.length > 0) {
    violations.push(createTextIssueViolation("extremism", response.text.extremism));
  }
  
  // Check for drug references in text
  if (response?.text?.drug && response.text.drug.length > 0) {
    violations.push(createTextIssueViolation("drug_text", response.text.drug));
  }
  
  // Check for weapon references in text
  if (response?.text?.weapon && response.text.weapon.length > 0) {
    violations.push(createTextIssueViolation("weapon_text", response.text.weapon));
  }
  
  // Check for violence text
  if (response?.text?.violence && response.text.violence.length > 0) {
    violations.push(createTextIssueViolation("violence_text", response.text.violence));
  }
  
  // Check for self-harm text
  if (response?.text?.["self-harm"] && response.text["self-harm"].length > 0) {
    violations.push(createTextIssueViolation("self_harm_text", response.text["self-harm"]));
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

function createOffensiveViolation(score: number, severity: Severity, details?: SightEngineApiResponse["offensive"]): ImageViolation {
  // Determine specific offensive content types
  const offensiveTypes: string[] = [];
  if (details?.nazi && details.nazi > 0.3) offensiveTypes.push("nazi symbolism");
  if (details?.asian_swastika && details.asian_swastika > 0.3) offensiveTypes.push("swastika");
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

type TextIssueType = "personal_info" | "link" | "social" | "extremism" | "drug_text" | "weapon_text" | "violence_text" | "self_harm_text";

const TEXT_ISSUE_CONFIG: Record<TextIssueType, { severity: Severity; category: string; policyRef: string; description: string; fix: string }> = {
  personal_info: {
    severity: "warning",
    category: "Personal Information in Image",
    policyRef: "Policy 4.1 – PII in Advertising",
    description: "Image contains visible personal information",
    fix: "Remove or blur any personal information (phone numbers, emails, addresses) from the image.",
  },
  link: {
    severity: "info",
    category: "External Links in Image",
    policyRef: "Policy 4.2 – External URLs",
    description: "Image contains external URLs or links",
    fix: "Review external links for compliance. Some platforms restrict external URLs in ad imagery.",
  },
  social: {
    severity: "info",
    category: "Social Media Handles in Image",
    policyRef: "Policy 4.3 – Social Media References",
    description: "Image contains social media handles or references",
    fix: "Ensure social media references comply with platform policies and don't direct users away from the ad platform.",
  },
  extremism: {
    severity: "critical",
    category: "Extremist Content in Image Text",
    policyRef: "Policy 3.8 – Extremist Content",
    description: "Image contains text with extremist or hateful content",
    fix: "Remove all extremist content immediately. This content violates all advertising platform policies.",
  },
  drug_text: {
    severity: "warning",
    category: "Drug References in Image Text",
    policyRef: "Policy 4.5 – Drug-Related Text",
    description: "Image contains text referencing drugs or controlled substances",
    fix: "Remove drug-related text or ensure it complies with platform policies for pharmaceutical advertising.",
  },
  weapon_text: {
    severity: "warning",
    category: "Weapon References in Image Text",
    policyRef: "Policy 4.6 – Weapon Content",
    description: "Image contains text referencing weapons",
    fix: "Remove weapon references unless explicitly allowed for your product category and platform.",
  },
  violence_text: {
    severity: "warning",
    category: "Violent Content in Image Text",
    policyRef: "Policy 3.3 – Violence References",
    description: "Image contains text with violent references",
    fix: "Remove violent language and use positive, constructive messaging instead.",
  },
  self_harm_text: {
    severity: "critical",
    category: "Self-Harm Content in Image Text",
    policyRef: "Policy 3.5 – Self-Harm References",
    description: "Image contains text referencing self-harm",
    fix: "Remove self-harm references immediately. Consider using supportive, recovery-focused language if appropriate.",
  },
};

function createTextIssueViolation(issueType: TextIssueType, matches: Array<{ type: string; match: string }>): ImageViolation {
  const config = TEXT_ISSUE_CONFIG[issueType];
  const matchStrings = matches.map(m => m.match).join(", ");
  
  return {
    id: uuidv4(),
    severity: config.severity,
    category: config.category,
    policyReference: config.policyRef,
    policyDescription: `${config.description}: "${matchStrings}".`,
    suggestedFix: config.fix,
    confidence: 1.0,
    imageIssueType: "graphic_content",
  };
}

/**
 * Calculate overall safety score (0-100, higher is safer)
 * 
 * CRITICAL RULE: If ANY category is >= 65%, image is flagged as UNSAFE (score capped at 20)
 * WARNING: Categories >= 40% will reduce the score significantly
 */
function calculateOverallSafetyScore(scores: SightEngineModerationScores): number {
  // Get max nudity score (weighted by severity)
  const maxNudity = Math.max(
    scores.nudity.sexual_activity,
    scores.nudity.sexual_display,
    scores.nudity.erotica,
    scores.nudity.very_suggestive,
    scores.nudity.suggestive * 0.7 // Slightly lower weight for just suggestive
  );

  // All critical categories to check
  const criticalCategories = [
    { score: maxNudity, label: "nudity", weight: 1.0 },
    { score: scores.gore, label: "gore", weight: 1.2 },           // Gore is very serious
    { score: scores.self_harm, label: "self_harm", weight: 1.3 }, // Self-harm is most serious
    { score: scores.recreational_drug, label: "drugs", weight: 1.0 },
    { score: scores.violence, label: "violence", weight: 1.0 },
    { score: scores.offensive, label: "offensive", weight: 1.1 },
  ];

  // CRITICAL CHECK: If ANY category is >= 65%, immediately flag as unsafe
  const CRITICAL_THRESHOLD = 0.65;
  const WARNING_THRESHOLD = 0.40;
  // AI-Generated uses a higher threshold since it's about disclosure, not safety
  const AI_CRITICAL_THRESHOLD = 0.85;
  const AI_WARNING_THRESHOLD = 0.70;
  
  let hasCriticalIssue = false;
  let hasWarningIssue = false;
  let maxCriticalScore = 0;
  
  for (const category of criticalCategories) {
    if (category.score >= CRITICAL_THRESHOLD) {
      hasCriticalIssue = true;
      maxCriticalScore = Math.max(maxCriticalScore, category.score * category.weight);
    } else if (category.score >= WARNING_THRESHOLD) {
      hasWarningIssue = true;
    }
  }

  // Check AI-generated as a critical issue requiring disclosure
  if (scores.ai_generated >= AI_CRITICAL_THRESHOLD) {
    hasCriticalIssue = true;
    // AI-generated impacts score significantly but slightly less than content violations
    maxCriticalScore = Math.max(maxCriticalScore, scores.ai_generated * 0.9);
  } else if (scores.ai_generated >= AI_WARNING_THRESHOLD) {
    hasWarningIssue = true;
  }

  // If critical issue found (>= 65%), cap score very low
  if (hasCriticalIssue) {
    // Score inversely proportional to how bad the issue is
    // At 65% risk: safety score = 20
    // At 80% risk: safety score = 10
    // At 100% risk: safety score = 0
    const safetyScore = Math.max(0, Math.round(20 * (1 - (maxCriticalScore - 0.65) / 0.35)));
    return safetyScore;
  }

  // Calculate base score from weighted penalties
  const weights = {
    nudity: 0.25,
    drugs: 0.15,
    gore: 0.20,
    violence: 0.15,
    self_harm: 0.20,
    offensive: 0.15,
    ai: 0.10, // AI-generated now has meaningful weight for score calculation
  };
  
  // Calculate weighted penalty (each category contributes to lowering the score)
  const penalty =
    maxNudity * weights.nudity +
    scores.recreational_drug * weights.drugs +
    scores.gore * weights.gore +
    scores.violence * weights.violence +
    scores.self_harm * weights.self_harm +
    scores.offensive * weights.offensive +
    scores.ai_generated * weights.ai;
  
  // Calculate base score (inverted - higher penalty = lower safety)
  let safetyScore = Math.max(0, Math.round((1 - penalty * 1.5) * 100));
  
  // If warning issues found (>= 40% but < 65%), cap at 60
  if (hasWarningIssue) {
    safetyScore = Math.min(safetyScore, 60);
  }
  
  return safetyScore;
}

