import { NextRequest, NextResponse } from "next/server";
import {
  analyzeTextCompliance,
  analyzeImageCompliance,
  generateComplianceReport,
} from "@/modules/compliance/services/complianceService";
import {
  analyzeTextComplianceWithGemini,
  analyzeImageComplianceWithGemini,
} from "@/modules/compliance/services/geminiService";
import { analyzeImageWithSightEngine } from "@/modules/compliance/services/sightEngineService";
import type { Platform, ProductCategory, SightEngineResult, LLMProvider } from "@/modules/compliance/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      marketingCopy,
      imageBase64,
      imageUrl,
      platform,
      productCategory,
      apiKey,
      provider = "gemini", // Default to Gemini
      imageOnly = false,
    } = body as {
      marketingCopy: string;
      imageBase64?: string;
      imageUrl?: string;
      platform: Platform;
      productCategory: ProductCategory;
      apiKey: string;
      provider?: LLMProvider;
      imageOnly?: boolean;
    };

    // Validate required fields based on mode
    if (imageOnly) {
      if (!imageBase64 && !imageUrl) {
        return NextResponse.json(
          { error: "Image is required for image-only scan" },
          { status: 400 }
        );
      }
    } else {
      if (!marketingCopy || !platform || !productCategory) {
        return NextResponse.json(
          { error: "Missing required fields: marketingCopy, platform, or productCategory" },
          { status: 400 }
        );
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: `${provider === "gemini" ? "Gemini" : "OpenAI"} API key is required` },
        { status: 400 }
      );
    }

    // Analyze image with SightEngine first (if image provided)
    let sightEngineResult: SightEngineResult | undefined;
    let finalImageUrl = imageUrl;

    if (imageBase64) {
      // Run SightEngine first to get moderation data
      sightEngineResult = await analyzeImageWithSightEngine(imageBase64).catch((err) => {
        console.error("SightEngine analysis failed:", err);
        return undefined;
      });
      finalImageUrl = imageBase64;
    } else if (imageUrl) {
      // If only URL provided, run SightEngine on it
      sightEngineResult = await analyzeImageWithSightEngine(imageUrl).catch((err) => {
        console.error("SightEngine analysis failed:", err);
        return undefined;
      });
    }

    // Prepare SightEngine data for AI prompt
    const sightEngineDataForPrompt = sightEngineResult ? {
      nudity: sightEngineResult.moderationScores.nudity,
      recreational_drug: sightEngineResult.moderationScores.recreational_drug,
      medical: sightEngineResult.moderationScores.medical,
      gore: sightEngineResult.moderationScores.gore,
      violence: sightEngineResult.moderationScores.violence,
      self_harm: sightEngineResult.moderationScores.self_harm,
      ai_generated: sightEngineResult.moderationScores.ai_generated,
      overallSafetyScore: sightEngineResult.overallSafetyScore,
    } : undefined;

    // Analyze based on mode
    let imageAnalysis;
    let textAnalysis;

    if (imageOnly) {
      // Image-only mode: only analyze the image
      if (imageBase64) {
        imageAnalysis = provider === "gemini"
          ? await analyzeImageComplianceWithGemini(imageBase64, platform, apiKey, sightEngineDataForPrompt)
          : await analyzeImageCompliance(imageBase64, platform, apiKey, sightEngineDataForPrompt);
      }
      // Create empty text analysis for image-only mode
      textAnalysis = {
        violations: [],
        missingDisclaimers: [],
        summary: "Image-only scan completed.",
        recommendations: [],
      };
    } else if (imageBase64) {
      // Full mode with image: Run text and image analysis in parallel
      const textAnalysisPromise = provider === "gemini"
        ? analyzeTextComplianceWithGemini(marketingCopy, platform, productCategory, apiKey)
        : analyzeTextCompliance(marketingCopy, platform, productCategory, apiKey);

      const imageAnalysisPromise = provider === "gemini"
        ? analyzeImageComplianceWithGemini(imageBase64, platform, apiKey, sightEngineDataForPrompt)
        : analyzeImageCompliance(imageBase64, platform, apiKey, sightEngineDataForPrompt);

      const [textResult, imageResult] = await Promise.all([
        textAnalysisPromise,
        imageAnalysisPromise,
      ]);
      
      textAnalysis = textResult;
      imageAnalysis = imageResult;
    } else {
      // Full mode without image: just text analysis
      textAnalysis = provider === "gemini"
        ? await analyzeTextComplianceWithGemini(marketingCopy, platform, productCategory, apiKey)
        : await analyzeTextCompliance(marketingCopy, platform, productCategory, apiKey);
    }

    // Generate comprehensive report
    const report = generateComplianceReport(
      marketingCopy,
      platform,
      productCategory,
      textAnalysis,
      imageAnalysis,
      finalImageUrl,
      sightEngineResult
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error("Compliance check error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    // Handle specific API errors
    if (errorMessage.includes("API key") || errorMessage.includes("API_KEY")) {
      return NextResponse.json(
        { error: "Invalid API key. Please check your API key and try again." },
        { status: 401 }
      );
    }

    if (errorMessage.includes("quota") || errorMessage.includes("rate")) {
      return NextResponse.json(
        { error: "API rate limit or quota exceeded. Please try again later." },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: `Compliance check failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
