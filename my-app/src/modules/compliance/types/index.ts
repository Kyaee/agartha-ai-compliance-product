// Compliance module types

export type Severity = "critical" | "warning" | "info";

export type Platform = "meta" | "google" | "tiktok";

export type LLMProvider = "openai" | "gemini";

// Predefined product categories
export type PredefinedProductCategory =
  | "erectile_dysfunction"
  | "hair_loss"
  | "weight_loss"
  | "skincare"
  | "supplements"
  | "mental_health";

// Product category can be predefined or custom string
export type ProductCategory = PredefinedProductCategory | string;

export interface Violation {
  id: string;
  severity: Severity;
  category: string;
  offendingText?: string;
  startIndex?: number;
  endIndex?: number;
  policyReference: string;
  policyDescription: string;
  suggestedFix: string;
  confidence: number; // 0-1
}

export interface ImageViolation extends Violation {
  imageRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageIssueType:
    | "before_after"
    | "nudity"
    | "negative_body_image"
    | "graphic_content"
    | "misleading_imagery";
  sourceUrl?: string; // Reference URL for policy citation
}

export interface ComplianceReport {
  id: string;
  timestamp: string;
  overallScore: number; // 0-100
  status: "pass" | "fail" | "review";
  textViolations: Violation[];
  imageViolations: ImageViolation[];
  // Violations found in text extracted from image (OCR)
  imageTextViolations?: Violation[];
  platform: Platform;
  productCategory: ProductCategory;
  originalText: string;
  imageUrl?: string;
  // Text extracted from image via OCR
  extractedImageText?: string;
  summary: string;
  recommendations: string[];
  // SightEngine moderation data
  imageModerationScores?: SightEngineModerationScores;
  imageSafetyScore?: number;
  // Text content issues detected in image
  hasProfanity?: boolean;
  profanityMatches?: string[];
}

export interface SubmissionData {
  marketingCopy: string;
  imageFile?: File;
  imageUrl?: string;
  platform: Platform;
  productCategory: ProductCategory;
}

export interface PolicyRule {
  id: string;
  category: string;
  type: "prohibited_claim" | "required_disclaimer" | "restricted_imagery" | "platform_specific";
  severity: Severity;
  pattern?: string;
  keywords?: string[];
  description: string;
  policyReference: string;
  suggestedAlternative?: string;
  platforms: Platform[] | "all";
  productCategories: ProductCategory[] | "all";
}

// SightEngine Image Moderation Types
export interface SightEngineModerationScores {
  nudity: {
    sexual_activity: number;
    sexual_display: number;
    erotica: number;
    very_suggestive: number;
    suggestive: number;
    none: number;
  };
  recreational_drug: number;
  medical: number;
  gore: number;
  violence: number;
  self_harm: number;
  ai_generated: number;
  offensive: number; // Offensive content detection score
}

export interface SightEngineResult {
  requestId: string;
  moderationScores: SightEngineModerationScores;
  violations: ImageViolation[];
  overallSafetyScore: number;
  // OCR - Extracted text from image
  extractedText?: string;
  hasProfanity?: boolean;
  profanityMatches?: string[];
  raw?: unknown;
}

