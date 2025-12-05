// Gemini AI Compliance Service

import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";
import { buildSystemPrompt, buildImageAnalysisPromptWithSightEngine, type SightEngineModerationData } from "../constants/prompts";
import type {
  ImageViolation,
  Platform,
  ProductCategory,
  Violation,
} from "../types";

interface TextAnalysisResult {
  violations: Violation[];
  missingDisclaimers: Omit<Violation, "offendingText" | "startIndex" | "endIndex">[];
  recommendations: string[];
}

interface ImageAnalysisResult {
  imageViolations: ImageViolation[];
  imageRecommendations: string[];
}

/**
 * Analyze text compliance using Gemini API
 */
export async function analyzeTextComplianceWithGemini(
  text: string,
  platform: Platform,
  productCategory: ProductCategory,
  apiKey: string
): Promise<TextAnalysisResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const systemPrompt = buildSystemPrompt(platform, productCategory);
  
  const prompt = `${systemPrompt}

Please analyze this healthcare marketing copy for compliance violations:

"""${text}"""

Respond with valid JSON only.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const content = response.text();

  if (!content) {
    throw new Error("No response from Gemini compliance analysis");
  }

  // Parse the JSON response
  let parsedResult: TextAnalysisResult;
  try {
    // Try to extract JSON from the response (in case it's wrapped in markdown)
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                      content.match(/```\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    parsedResult = JSON.parse(jsonStr.trim());
  } catch {
    // If parsing fails, try to extract JSON object directly
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}') + 1;
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      parsedResult = JSON.parse(content.slice(jsonStart, jsonEnd));
    } else {
      throw new Error("Failed to parse Gemini response as JSON");
    }
  }

  // Ensure arrays exist and have IDs
  parsedResult.violations = (parsedResult.violations || []).map((v) => ({
    ...v,
    id: v.id || uuidv4(),
  }));

  parsedResult.missingDisclaimers = (parsedResult.missingDisclaimers || []).map((d) => ({
    ...d,
    id: d.id || uuidv4(),
  }));

  parsedResult.recommendations = parsedResult.recommendations || [];

  return parsedResult;
}

/**
 * Fetch image from URL and convert to base64
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Data = buffer.toString("base64");
  
  // Get mime type from response headers or default to jpeg
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const mimeType = contentType.split(";")[0].trim();
  
  return { data: base64Data, mimeType };
}

/**
 * Analyze image compliance using Gemini API
 * Supports both base64 encoded images and URLs
 */
export async function analyzeImageComplianceWithGemini(
  imageSource: string,
  platform: Platform,
  apiKey: string,
  sightEngineData?: SightEngineModerationData
): Promise<ImageAnalysisResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  // Determine if input is URL or base64
  const isUrl = imageSource.startsWith("http://") || imageSource.startsWith("https://");
  
  let mimeType = "image/jpeg";
  let base64Data: string;
  
  if (isUrl) {
    // Fetch image from URL and convert to base64
    const imageData = await fetchImageAsBase64(imageSource);
    base64Data = imageData.data;
    mimeType = imageData.mimeType;
  } else if (imageSource.startsWith("data:")) {
    // Extract from data URL
    const matches = imageSource.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64Data = matches[2];
    } else {
      base64Data = imageSource;
    }
  } else {
    // Assume raw base64
    base64Data = imageSource;
  }

  // Build prompt with SightEngine context if available
  const systemPrompt = buildImageAnalysisPromptWithSightEngine(platform, sightEngineData);

  const prompt = `${systemPrompt}

${sightEngineData ? "SightEngine pre-scan results are provided above - use them to inform your analysis." : ""}

Respond with valid JSON only.`;

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  const content = response.text();

  if (!content) {
    throw new Error("No response from Gemini image analysis");
  }

  // Parse the JSON response
  let parsedResult: ImageAnalysisResult;
  try {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                      content.match(/```\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    parsedResult = JSON.parse(jsonStr.trim());
  } catch {
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}') + 1;
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      parsedResult = JSON.parse(content.slice(jsonStart, jsonEnd));
    } else {
      throw new Error("Failed to parse Gemini image response as JSON");
    }
  }

  // Ensure arrays exist and have IDs
  parsedResult.imageViolations = (parsedResult.imageViolations || []).map((v) => ({
    ...v,
    id: v.id || uuidv4(),
  }));

  parsedResult.imageRecommendations = parsedResult.imageRecommendations || [];

  return parsedResult;
}

