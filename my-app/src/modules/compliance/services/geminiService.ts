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
  summary: string;
  recommendations: string[];
}

interface ImageAnalysisResult {
  imageViolations: ImageViolation[];
  imageSummary: string;
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
  parsedResult.summary = parsedResult.summary || "Analysis complete.";

  return parsedResult;
}

/**
 * Analyze image compliance using Gemini API
 */
export async function analyzeImageComplianceWithGemini(
  imageBase64: string,
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

  // Extract base64 data and mime type
  let mimeType = "image/jpeg";
  let base64Data = imageBase64;
  
  if (imageBase64.startsWith("data:")) {
    const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
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
  parsedResult.imageSummary = parsedResult.imageSummary || "Image analysis complete.";

  return parsedResult;
}

