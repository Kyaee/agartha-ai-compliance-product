import { NextRequest, NextResponse } from "next/server";
import {
  analyzeTextCompliance,
  analyzeImageCompliance,
  generateComplianceReport,
  type TextAnalysisResult,
} from "@/modules/compliance/services/complianceService";
import {
  analyzeTextComplianceWithGemini,
  analyzeImageComplianceWithGemini,
} from "@/modules/compliance/services/geminiService";
import { analyzeImageByUpload, analyzeImageByUrl } from "@/modules/compliance/services/sightEngineService";
import type { Platform, ProductCategory, SightEngineResult, LLMProvider } from "@/modules/compliance/types";

// Default Gemini API key from environment
const DEFAULT_GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

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

    // Use default Gemini API key if not provided, require API key for OpenAI
    const effectiveApiKey: string = provider === "gemini" 
      ? (apiKey || DEFAULT_GEMINI_API_KEY) 
      : apiKey;

    if (provider === "openai" && !effectiveApiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is required" },
        { status: 400 }
      );
    }

    if (provider === "gemini" && !effectiveApiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Please set GEMINI_API_KEY environment variable." },
        { status: 400 }
      );
    }

    // Analyze image with SightEngine first (if image provided)
    // Uses different methods for uploaded files vs URLs
    let sightEngineResult: SightEngineResult | undefined;
    let finalImageUrl = imageUrl;

    if (imageBase64) {
      // For uploaded images: use POST with form data
      sightEngineResult = await analyzeImageByUpload(imageBase64).catch((err) => {
        console.error("SightEngine upload analysis failed:", err);
        return undefined;
      });
      finalImageUrl = imageBase64;
    } else if (imageUrl) {
      // For URL images: use GET with URL parameter
      sightEngineResult = await analyzeImageByUrl(imageUrl).catch((err) => {
        console.error("SightEngine URL analysis failed:", err);
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

    // Get extracted text from image (OCR) if available
    const extractedImageText = sightEngineResult?.extractedText || "";

    // Analyze based on mode
    let imageAnalysis;
    let textAnalysis: TextAnalysisResult;
    let imageTextAnalysis;

    if (imageOnly) {
      // Image-only mode: only analyze the image (supports both upload and URL)
      const imageSource = imageBase64 || imageUrl;
      if (imageSource) {
        imageAnalysis = provider === "gemini"
          ? await analyzeImageComplianceWithGemini(imageSource, platform, effectiveApiKey, sightEngineDataForPrompt)
          : await analyzeImageCompliance(imageSource, platform, effectiveApiKey, sightEngineDataForPrompt);
      }
      
      // If OCR extracted text from the image, analyze it too
      if (extractedImageText && extractedImageText.length > 10) {
        console.log("[OCR] Analyzing extracted image text:", extractedImageText);
        imageTextAnalysis = provider === "gemini"
          ? await analyzeTextComplianceWithGemini(extractedImageText, platform, productCategory, effectiveApiKey).catch(err => {
              console.error("Image text analysis failed:", err);
              return null;
            })
          : await analyzeTextCompliance(extractedImageText, platform, productCategory, effectiveApiKey).catch(err => {
              console.error("Image text analysis failed:", err);
              return null;
            });
      }
      
      // Create empty text analysis for image-only mode
      textAnalysis = {
        violations: [],
        missingDisclaimers: [],
        recommendations: [],
      };
    } else if (imageBase64 || imageUrl) {
      // Full mode with image: Run text and image analysis in parallel
      const imageSource = imageBase64 || imageUrl!;
      
      const analysisPromises: Promise<unknown>[] = [
        provider === "gemini"
          ? analyzeTextComplianceWithGemini(marketingCopy, platform, productCategory, effectiveApiKey)
          : analyzeTextCompliance(marketingCopy, platform, productCategory, effectiveApiKey),
        provider === "gemini"
          ? analyzeImageComplianceWithGemini(imageSource, platform, effectiveApiKey, sightEngineDataForPrompt)
          : analyzeImageCompliance(imageSource, platform, effectiveApiKey, sightEngineDataForPrompt),
      ];
      
      // If OCR extracted text from the image, analyze it too
      if (extractedImageText && extractedImageText.length > 10) {
        console.log("[OCR] Analyzing extracted image text:", extractedImageText);
        analysisPromises.push(
          provider === "gemini"
            ? analyzeTextComplianceWithGemini(extractedImageText, platform, productCategory, effectiveApiKey).catch(err => {
                console.error("Image text analysis failed:", err);
                return null;
              })
            : analyzeTextCompliance(extractedImageText, platform, productCategory, effectiveApiKey).catch(err => {
                console.error("Image text analysis failed:", err);
                return null;
              })
        );
      }

      const results = await Promise.all(analysisPromises);
      
      textAnalysis = results[0] as typeof textAnalysis;
      imageAnalysis = results[1] as typeof imageAnalysis;
      imageTextAnalysis = results[2] as typeof imageTextAnalysis;
    } else {
      // Full mode without image: just text analysis
      textAnalysis = provider === "gemini"
        ? await analyzeTextComplianceWithGemini(marketingCopy, platform, productCategory, effectiveApiKey)
        : await analyzeTextCompliance(marketingCopy, platform, productCategory, effectiveApiKey);
    }

    // Generate comprehensive report
    const report = generateComplianceReport(
      marketingCopy,
      platform,
      productCategory,
      textAnalysis,
      imageAnalysis,
      finalImageUrl,
      sightEngineResult,
      imageTextAnalysis || undefined,
      extractedImageText || undefined
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
