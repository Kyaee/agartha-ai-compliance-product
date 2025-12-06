"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, FileText, Image as ImageIcon, Loader2, AlertCircle, X, Sparkles, Clipboard, ScanEye, FileSearch, Edit3 } from "lucide-react";
import type { Platform, ProductCategory, PredefinedProductCategory, SubmissionData, LLMProvider } from "../types";
import { PLATFORM_DISPLAY_NAMES, PRODUCT_CATEGORY_DISPLAY_NAMES } from "../constants/policies";

// Safeguards for custom product category input
const CATEGORY_SAFEGUARDS = {
  maxLength: 50,
  minLength: 3,
  // Prohibited words/patterns (inappropriate content)
  prohibitedPatterns: [
    /\b(fuck|shit|damn|ass|bitch|cunt|dick|cock|pussy)\b/i,
    /\b(nigger|nigga|faggot|retard)\b/i,
    /[<>{}[\]\\\/]/,  // No code injection characters
    /https?:\/\//i,    // No URLs
    /\b(script|eval|onclick|onerror)\b/i, // No script injection
  ],
  // Must be healthcare/product related - allow general product descriptions
  allowedPattern: /^[a-zA-Z0-9\s\-\&\'\(\)]+$/,
};

function sanitizeCategory(input: string): { valid: boolean; sanitized: string; error?: string } {
  const trimmed = input.trim();
  
  if (trimmed.length < CATEGORY_SAFEGUARDS.minLength) {
    return { valid: false, sanitized: trimmed, error: `Category must be at least ${CATEGORY_SAFEGUARDS.minLength} characters` };
  }
  
  if (trimmed.length > CATEGORY_SAFEGUARDS.maxLength) {
    return { valid: false, sanitized: trimmed, error: `Category must be less than ${CATEGORY_SAFEGUARDS.maxLength} characters` };
  }
  
  // Check for prohibited patterns
  for (const pattern of CATEGORY_SAFEGUARDS.prohibitedPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, sanitized: trimmed, error: "Category contains inappropriate content" };
    }
  }
  
  // Check allowed characters
  if (!CATEGORY_SAFEGUARDS.allowedPattern.test(trimmed)) {
    return { valid: false, sanitized: trimmed, error: "Category can only contain letters, numbers, spaces, hyphens, and basic punctuation" };
  }
  
  // Capitalize first letter of each word
  const sanitized = trimmed
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
  
  return { valid: true, sanitized };
}

interface SubmissionFormProps {
  onSubmit: (data: SubmissionData & { apiKey: string; provider: LLMProvider; imageOnly?: boolean }) => Promise<void>;
  isLoading: boolean;
}

const LLM_PROVIDERS: Record<LLMProvider, { name: string; icon: string; placeholder: string }> = {
  gemini: { name: "Google Gemini", icon: "✨", placeholder: "AIza..." },
  openai: { name: "OpenAI GPT-4o", icon: "🤖", placeholder: "sk-..." },
};

const EXAMPLE_NON_COMPLIANT = `🔥 MIRACLE WEIGHT LOSS SOLUTION! 🔥

Lose 30 pounds in just 2 weeks with our FDA-approved supplement! 

✅ GUARANTEED RESULTS or your money back!
✅ Works INSTANTLY - see changes overnight!
✅ 100% CURE for obesity - no diet needed!
✅ Zero side effects - completely safe!
✅ Doctors recommend this miracle pill!

Before and after photos don't lie - your transformation starts NOW!

Don't wait - your dream body is just one pill away!`;

export function SubmissionForm({ onSubmit, isLoading }: SubmissionFormProps) {
  const [marketingCopy, setMarketingCopy] = useState("");
  const [platform, setPlatform] = useState<Platform>("meta");
  const [productCategory, setProductCategory] = useState<ProductCategory>("weight_loss");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [customCategoryError, setCustomCategoryError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [provider, setProvider] = useState<LLMProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageOnly, setImageOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Handle custom category input change
  const handleCustomCategoryChange = (value: string) => {
    setCustomCategoryInput(value);
    setCustomCategoryError(null);
    
    if (value.trim()) {
      const result = sanitizeCategory(value);
      if (!result.valid && result.error) {
        setCustomCategoryError(result.error);
      } else {
        setProductCategory(result.sanitized);
      }
    }
  };

  // Handle category selection change
  const handleCategoryChange = (value: string) => {
    if (value === "__custom__") {
      setIsCustomCategory(true);
      setCustomCategoryInput("");
      setProductCategory("");
    } else {
      setIsCustomCategory(false);
      setCustomCategoryInput("");
      setCustomCategoryError(null);
      setProductCategory(value as PredefinedProductCategory);
    }
  };

  // Handle image from File object (used by upload, paste, and drop)
  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please paste or drop an image file");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be less than 10MB");
      return;
    }

    setImageFile(file);
    setImageUrl("");
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle paste event
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleImageFile(file);
        }
        break;
      }
    }
  }, [handleImageFile]);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageFile(files[0]);
    }
  }, [handleImageFile]);

  // Add paste event listener
  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrl("");
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (url: string) => {
    setImageUrl(url);
    setImageFile(null);
    if (url) {
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImageUrl("");
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const loadExample = () => {
    setMarketingCopy(EXAMPLE_NON_COMPLIANT);
    setPlatform("meta");
    setProductCategory("weight_loss");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation based on mode
    if (imageOnly) {
      if (!imageFile && !imageUrl) {
        setError("Please upload an image or enter an image URL for image-only scan");
        return;
      }
    } else {
      if (!marketingCopy.trim()) {
        setError("Please enter marketing copy to analyze");
        return;
      }
    }

    // Validate custom category
    if (isCustomCategory) {
      if (!customCategoryInput.trim()) {
        setError("Please enter a custom product category");
        return;
      }
      const result = sanitizeCategory(customCategoryInput);
      if (!result.valid) {
        setError(result.error || "Invalid product category");
        return;
      }
    }

    // Validate that a category is selected
    if (!productCategory) {
      setError("Please select or enter a product category");
      return;
    }

    // Only require API key for OpenAI
    if (provider === "openai" && !apiKey.trim()) {
      setError(`Please enter your ${LLM_PROVIDERS[provider].name} API key`);
      return;
    }

    try {
      await onSubmit({
        marketingCopy: imageOnly ? "" : marketingCopy,
        imageFile: imageFile || undefined,
        imageUrl: imageUrl || undefined,
        platform,
        productCategory,
        apiKey,
        provider,
        imageOnly,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Scan Mode Toggle */}
      <div className="form-group">
        <label className="form-label">
          <span className="flex items-center gap-2">
            <ScanEye className="w-4 h-4" />
            Scan Mode
          </span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setImageOnly(false)}
            className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all ${
              !imageOnly
                ? "border-blue-500 bg-blue-500/10 text-white"
                : "border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600 hover:bg-slate-800/50"
            }`}
          >
            <FileSearch className="w-5 h-5 sm:w-6 sm:h-6" />
            <div className="text-left">
              <div className={`font-medium text-sm sm:text-base ${!imageOnly ? "text-white" : "text-slate-300"}`}>
                Full Analysis
              </div>
              <div className="text-xs text-slate-500 hidden sm:block">Text + Image</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setImageOnly(true)}
            className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all ${
              imageOnly
                ? "border-violet-500 bg-violet-500/10 text-white"
                : "border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600 hover:bg-slate-800/50"
            }`}
          >
            <ScanEye className="w-5 h-5 sm:w-6 sm:h-6" />
            <div className="text-left">
              <div className={`font-medium text-sm sm:text-base ${imageOnly ? "text-white" : "text-slate-300"}`}>
                Image Only
              </div>
              <div className="text-xs text-slate-500 hidden sm:block">Quick image scan</div>
            </div>
          </button>
        </div>
        {imageOnly && (
          <p className="text-xs text-violet-400 mt-2 flex items-center gap-1">
            <ScanEye className="w-3 h-3" />
            SightEngine moderation + AI visual analysis
          </p>
        )}
      </div>

      {/* LLM Provider Selection */}
      <div className="form-group">
        <label className="form-label">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Provider
          </span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(LLM_PROVIDERS) as [LLMProvider, typeof LLM_PROVIDERS[LLMProvider]][]).map(([key, config]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setProvider(key);
                setApiKey(""); // Clear API key when switching providers
              }}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                provider === key
                  ? "border-violet-500 bg-violet-500/10 text-white"
                  : "border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600 hover:bg-slate-800/50"
              }`}
            >
              <span className="text-2xl">{config.icon}</span>
              <div className="text-left">
                <div className={`font-medium ${provider === key ? "text-white" : "text-slate-300"}`}>
                  {config.name}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* API Key Input - Only show for OpenAI */}
      {provider === "openai" && (
        <div className="form-group">
          <label htmlFor="apiKey" className="form-label">
            <span className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span>🔑 {LLM_PROVIDERS[provider].name} API Key</span>
              <span className="text-xs font-normal text-slate-400">(stored locally only)</span>
            </span>
          </label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={LLM_PROVIDERS[provider].placeholder}
            className="form-input"
          />
          <p className="text-xs text-slate-500 mt-2">
            Get your API key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">OpenAI Platform</a>
          </p>
        </div>
      )}

      {/* Platform & Category Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group">
          <label htmlFor="platform" className="form-label">
            📱 Target Platform
          </label>
          <select
            id="platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className="form-select"
          >
            {Object.entries(PLATFORM_DISPLAY_NAMES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="category" className="form-label">
            💊 Product Category
          </label>
          <select
            id="category"
            value={isCustomCategory ? "__custom__" : productCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="form-select"
          >
            {Object.entries(PRODUCT_CATEGORY_DISPLAY_NAMES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
            <option value="__custom__">✏️ Custom Category...</option>
          </select>
          
          {/* Custom Category Input */}
          {isCustomCategory && (
            <div className="mt-3 space-y-2">
              <div className="relative flex items-center">
                <Edit3 className="absolute left-4 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={customCategoryInput}
                  onChange={(e) => handleCustomCategoryChange(e.target.value)}
                  placeholder="Enter your product category (e.g., Dental Care, Vision Health)"
                  className={`form-input pl-12! ${customCategoryError ? "border-red-500/50 focus:ring-red-500/50" : ""}`}
                  maxLength={CATEGORY_SAFEGUARDS.maxLength}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={customCategoryError ? "text-red-400" : "text-slate-500"}>
                  {customCategoryError || "Letters, numbers, and basic punctuation only"}
                </span>
                <span className="text-slate-500">
                  {customCategoryInput.length}/{CATEGORY_SAFEGUARDS.maxLength}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Marketing Copy Input - Hidden in Image Only mode */}
      {!imageOnly && (
        <div className="form-group">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <label htmlFor="copy" className="form-label mb-0">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Marketing Copy
              </span>
            </label>
            <button
              type="button"
              onClick={loadExample}
              className="text-xs px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-full hover:bg-amber-500/30 transition-colors w-fit"
            >
              Load Example
            </button>
          </div>
          <textarea
            id="copy"
            value={marketingCopy}
            onChange={(e) => setMarketingCopy(e.target.value)}
            placeholder="Paste your healthcare marketing copy here..."
            rows={10}
            className="form-textarea font-mono text-sm"
          />
          <div className="text-xs text-slate-500 mt-1">
            {marketingCopy.length} characters
          </div>
        </div>
      )}

      {/* Image Upload Section */}
      <div className="form-group">
        <label className="form-label">
          <span className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Ad Creative / Image {imageOnly ? <span className="text-violet-400">(Required)</span> : "(Optional)"}
          </span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* File Upload / Paste / Drop Zone */}
          <div
            ref={dropZoneRef}
            onClick={() => !imageUrl && fileInputRef.current?.click()}
            onDragEnter={!imageUrl ? handleDragEnter : undefined}
            onDragLeave={!imageUrl ? handleDragLeave : undefined}
            onDragOver={!imageUrl ? handleDragOver : undefined}
            onDrop={!imageUrl ? handleDrop : undefined}
            className={`upload-zone transition-all duration-200 ${
              isDragging 
                ? "border-violet-500 bg-violet-500/10 scale-[1.02]" 
                : ""
            } ${imageUrl ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={!!imageUrl}
            />
            {isDragging ? (
              <>
                <Upload className="w-8 h-8 text-violet-400 mx-auto mb-2 animate-bounce" />
                <p className="text-sm text-violet-400 font-medium">
                  Drop image here
                </p>
              </>
            ) : (
              <>
                <Upload className={`w-8 h-8 mx-auto mb-2 ${imageUrl ? "text-slate-600" : "text-slate-500"}`} />
                <p className={`text-sm ${imageUrl ? "text-slate-600" : "text-slate-400"}`}>
                  {imageUrl ? "Clear URL to upload file" : "Click, drag & drop, or paste"}
                </p>
                {!imageUrl && (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-400 flex items-center gap-1">
                      <Clipboard className="w-3 h-3" />
                      Ctrl+V
                    </span>
                    <span className="text-xs text-slate-500">to paste</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  PNG, JPG, GIF up to 10MB
                </p>
              </>
            )}
          </div>

          {/* URL Input */}
          <div className="flex flex-col justify-center">
            <label className={`text-xs mb-2 ${imageFile ? "text-slate-600" : "text-slate-400"}`}>
              {imageFile ? "Clear uploaded image to use URL" : "Or enter image URL:"}
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => handleImageUrlChange(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className={`form-input ${imageFile ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={!!imageFile}
            />
          </div>
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="mt-4 relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-48 rounded-lg border border-slate-700"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="submit-button"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {imageOnly ? "Scanning Image..." : "Analyzing Compliance..."}
          </>
        ) : (
          <>
            {imageOnly ? (
              <>
                <ScanEye className="w-5 h-5" />
                Scan Image
              </>
            ) : (
              <>🔍 Check Compliance</>
            )}
          </>
        )}
      </button>
    </form>
  );
}

