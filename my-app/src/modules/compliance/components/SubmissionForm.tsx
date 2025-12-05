"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Image as ImageIcon, Loader2, AlertCircle, X } from "lucide-react";
import type { Platform, ProductCategory, SubmissionData } from "../types";
import { PLATFORM_DISPLAY_NAMES, PRODUCT_CATEGORY_DISPLAY_NAMES } from "../constants/policies";

interface SubmissionFormProps {
  onSubmit: (data: SubmissionData & { apiKey: string }) => Promise<void>;
  isLoading: boolean;
}

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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (!marketingCopy.trim()) {
      setError("Please enter marketing copy to analyze");
      return;
    }

    if (!apiKey.trim()) {
      setError("Please enter your OpenAI API key");
      return;
    }

    try {
      await onSubmit({
        marketingCopy,
        imageFile: imageFile || undefined,
        imageUrl: imageUrl || undefined,
        platform,
        productCategory,
        apiKey,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* API Key Input */}
      <div className="form-group">
        <label htmlFor="apiKey" className="form-label">
          <span className="flex items-center gap-2">
            🔑 OpenAI API Key
            <span className="text-xs font-normal text-slate-400">(stored locally, never sent to our servers)</span>
          </span>
        </label>
        <input
          type="password"
          id="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="form-input"
        />
      </div>

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
            value={productCategory}
            onChange={(e) => setProductCategory(e.target.value as ProductCategory)}
            className="form-select"
          >
            {Object.entries(PRODUCT_CATEGORY_DISPLAY_NAMES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Marketing Copy Input */}
      <div className="form-group">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="copy" className="form-label mb-0">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Marketing Copy
            </span>
          </label>
          <button
            type="button"
            onClick={loadExample}
            className="text-xs px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full hover:bg-amber-500/30 transition-colors"
          >
            Load Non-Compliant Example
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

      {/* Image Upload Section */}
      <div className="form-group">
        <label className="form-label">
          <span className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Ad Creative / Image (Optional)
          </span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* File Upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="upload-zone"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              Click to upload or drag & drop
            </p>
            <p className="text-xs text-slate-500 mt-1">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>

          {/* URL Input */}
          <div className="flex flex-col justify-center">
            <label className="text-xs text-slate-400 mb-2">Or enter image URL:</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => handleImageUrlChange(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="form-input"
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
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
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
            Analyzing Compliance...
          </>
        ) : (
          <>
            🔍 Check Compliance
          </>
        )}
      </button>
    </form>
  );
}

