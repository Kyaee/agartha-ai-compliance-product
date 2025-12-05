"use client";

import { useState } from "react";
import { Shield, Zap, FileCheck, ArrowRight, CheckCircle } from "lucide-react";
import { SubmissionForm, ComplianceReport } from "@/modules/compliance/components";
import type { ComplianceReport as ComplianceReportType, SubmissionData } from "@/modules/compliance/types";

export default function Home() {
  const [report, setReport] = useState<ComplianceReportType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: SubmissionData & { apiKey: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      // Convert image file to base64 if present
      let imageBase64: string | undefined;
      if (data.imageFile) {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(data.imageFile!);
        });
      }

      const response = await fetch("/api/compliance/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marketingCopy: data.marketingCopy,
          imageBase64,
          imageUrl: data.imageUrl,
          platform: data.platform,
          productCategory: data.productCategory,
          apiKey: data.apiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check compliance");
      }

      const reportData = await response.json();
      setReport(reportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setReport(null);
    setError(null);
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent mb-4">
            Healthcare Ad Compliance Gate
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            AI-powered compliance checking for healthcare marketing content. 
            Catch policy violations before they go live.
          </p>
        </header>

        {/* Feature highlights - only show when no report */}
        {!report && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 animate-slide-up stagger-1" style={{ opacity: 0 }}>
            <div className="card flex items-start gap-3 p-4">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-lg flex-shrink-0">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200 text-sm">Instant Analysis</h3>
                <p className="text-xs text-slate-400 mt-1">Real-time compliance checking powered by GPT-4o</p>
              </div>
            </div>
            <div className="card flex items-start gap-3 p-4">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-500/20 rounded-lg flex-shrink-0">
                <FileCheck className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200 text-sm">Policy Database</h3>
                <p className="text-xs text-slate-400 mt-1">25+ rules covering Meta, Google & TikTok policies</p>
              </div>
            </div>
            <div className="card flex items-start gap-3 p-4">
              <div className="flex items-center justify-center w-10 h-10 bg-green-500/20 rounded-lg flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200 text-sm">Actionable Fixes</h3>
                <p className="text-xs text-slate-400 mt-1">Get specific suggestions to make your ads compliant</p>
              </div>
            </div>
          </div>
        )}

        {/* Main content area */}
        <main className="card animate-slide-up stagger-2" style={{ opacity: 0 }}>
          {!report ? (
            <>
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-700">
                <ArrowRight className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-semibold text-slate-200">Submit Your Ad Content</h2>
              </div>
              <SubmissionForm onSubmit={handleSubmit} isLoading={isLoading} />
            </>
          ) : (
            <ComplianceReport report={report} onReset={handleReset} />
          )}
        </main>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-slate-500">
          <p>
            Built for Agartha AI Compliance • Powered by OpenAI GPT-4o
          </p>
          <p className="mt-2 text-xs text-slate-600">
            This tool provides guidance only. Always consult with legal/compliance teams for final approval.
          </p>
        </footer>
      </div>
    </div>
  );
}
