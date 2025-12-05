// Compliance module types

export type Severity = "critical" | "warning" | "info";

export type Platform = "meta" | "google" | "tiktok";

export type ProductCategory =
  | "erectile_dysfunction"
  | "hair_loss"
  | "weight_loss"
  | "skincare"
  | "supplements"
  | "mental_health"
  | "other";

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
}

export interface ComplianceReport {
  id: string;
  timestamp: string;
  overallScore: number; // 0-100
  status: "pass" | "fail" | "review";
  textViolations: Violation[];
  imageViolations: ImageViolation[];
  platform: Platform;
  productCategory: ProductCategory;
  originalText: string;
  imageUrl?: string;
  summary: string;
  recommendations: string[];
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

