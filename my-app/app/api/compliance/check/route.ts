import { NextRequest, NextResponse } from "next/server";
import {
  analyzeTextCompliance,
  analyzeImageCompliance,
  generateComplianceReport,
} from "@/modules/compliance/services/complianceService";
import type { Platform, ProductCategory } from "@/modules/compliance/types";

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
    } = body as {
      marketingCopy: string;
      imageBase64?: string;
      imageUrl?: string;
      platform: Platform;
      productCategory: ProductCategory;
      apiKey: string;
    };

    // Validate required fields
    if (!marketingCopy || !platform || !productCategory) {
      return NextResponse.json(
        { error: "Missing required fields: marketingCopy, platform, or productCategory" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is required" },
        { status: 400 }
      );
    }

    // Analyze text
    const textAnalysis = await analyzeTextCompliance(
      marketingCopy,
      platform,
      productCategory,
      apiKey
    );

    // Analyze image if provided
    let imageAnalysis;
    let finalImageUrl = imageUrl;

    if (imageBase64) {
      imageAnalysis = await analyzeImageCompliance(imageBase64, platform, apiKey);
      finalImageUrl = imageBase64;
    }

    // Generate comprehensive report
    const report = generateComplianceReport(
      marketingCopy,
      platform,
      productCategory,
      textAnalysis,
      imageAnalysis,
      finalImageUrl
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error("Compliance check error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    // Handle specific OpenAI errors
    if (errorMessage.includes("API key")) {
      return NextResponse.json(
        { error: "Invalid OpenAI API key" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: `Compliance check failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

