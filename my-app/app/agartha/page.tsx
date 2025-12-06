"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Shield, 
  ChevronLeft, 
  ScanSearch, 
  FileBarChart,
  Sparkles,
  Brain,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  ArrowRight
} from "lucide-react";
import { SubmissionForm, ComplianceReport } from "@/modules/compliance/components";
import type { ComplianceReport as ComplianceReportType, SubmissionData, LLMProvider } from "@/modules/compliance/types";

type Tab = "analyze" | "results";

export default function AgarthaCompliance() {
  const [activeTab, setActiveTab] = useState<Tab>("analyze");
  const [report, setReport] = useState<ComplianceReportType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [tabAnimating, setTabAnimating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTabChange = (tab: Tab, force = false) => {
    if (tab === activeTab) return;
    if (tab === "results" && !report && !force) return;
    
    setTabAnimating(true);
    setTimeout(() => {
      setActiveTab(tab);
      setTimeout(() => setTabAnimating(false), 50);
    }, 150);
  };

  const handleSubmit = async (data: SubmissionData & { apiKey: string; provider: LLMProvider; imageOnly?: boolean }) => {
    setIsLoading(true);
    setError(null);

    try {
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketingCopy: data.marketingCopy,
          imageBase64,
          imageUrl: data.imageUrl,
          platform: data.platform,
          productCategory: data.productCategory,
          apiKey: data.apiKey,
          provider: data.provider,
          imageOnly: data.imageOnly,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check compliance");
      }

      const reportData = await response.json();
      setReport(reportData);
      handleTabChange("results", true); // Force switch to results tab
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
    handleTabChange("analyze");
  };

  const handleNewAnalysis = () => {
    handleTabChange("analyze");
  };

  return (
    <div className="min-h-screen">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 60%)",
            top: "-300px",
            right: "-200px",
            animation: "float-orb 20s ease-in-out infinite",
          }}
        />
        <div 
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 60%)",
            bottom: "-200px",
            left: "-150px",
            animation: "float-orb 25s ease-in-out infinite reverse",
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 60%)",
            top: "40%",
            left: "20%",
            animation: "float-orb 15s ease-in-out infinite 5s",
          }}
        />
      </div>

      {/* Top Navigation Bar */}
      <nav 
        className={`sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800/50 transition-all duration-500 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Back */}
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-all duration-300 group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
                <span className="text-sm hidden sm:inline">Home</span>
              </Link>
              <div className="h-6 w-px bg-slate-700" />
              <div className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow duration-300">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-white hidden sm:inline">Agartha AI</span>
              </div>
            </div>

            {/* Status Badge */}
            <div className={`transition-all duration-500 ${isLoading ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
              <div className="flex items-center gap-2 px-4 py-2 bg-violet-500/20 border border-violet-500/30 rounded-full animate-pulse-glow">
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                <span className="text-sm text-violet-300 font-medium">Analyzing</span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header Section */}
        <header 
          className={`text-center mb-6 sm:mb-8 transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div 
            className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-violet-600 rounded-2xl sm:rounded-3xl mb-5 shadow-2xl shadow-violet-500/30 animate-float"
          >
            <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 text-white">
            Healthcare Ad Compliance
          </h1>
          <p 
            className={`text-sm sm:text-base text-slate-400 max-w-xl mx-auto transition-all duration-700 delay-200 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Instant AI-powered compliance checking for Meta, Google & TikTok
          </p>
        </header>

        {/* Full Width Tab Navigation */}
        <div 
          className={`mb-6 sm:mb-8 transition-all duration-700 delay-100 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative p-1.5 bg-white/10 backdrop-blur-md rounded-[10px] border border-white/20 shadow-lg shadow-black/10">
            {/* Animated Tab Indicator */}
            <div 
              className="absolute top-1.5 bottom-1.5 rounded-xl bg-violet-600 shadow-lg shadow-violet-500/30 transition-all duration-500 ease-out"
              style={{
                left: activeTab === "analyze" ? "6px" : "calc(50% + 3px)",
                width: "calc(50% - 9px)",
              }}
            />
            
            <div className="relative grid grid-cols-2 gap-1">
              {/* Analyze Tab */}
              <button
                onClick={() => handleTabChange("analyze")}
                className={`relative flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-4 sm:py-5 rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 ${
                  activeTab === "analyze"
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ScanSearch className={`w-5 h-5 transition-transform duration-300 ${activeTab === "analyze" ? "scale-110" : ""}`} />
                <span>Analyze</span>
                {isLoading && activeTab === "analyze" && (
                  <Sparkles className="w-4 h-4 animate-spin-slow" />
                )}
              </button>

              {/* Results Tab */}
              <button
                onClick={() => handleTabChange("results")}
                disabled={!report}
                className={`relative flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-4 sm:py-5 rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 ${
                  activeTab === "results"
                    ? "text-white"
                    : report 
                      ? "text-slate-400 hover:text-slate-200"
                      : "text-slate-600 cursor-not-allowed"
                }`}
              >
                <FileBarChart className={`w-5 h-5 transition-transform duration-300 ${activeTab === "results" ? "scale-110" : ""}`} />
                <span>Results</span>
                {report && (
                  <span className={`ml-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                    activeTab === "results" 
                      ? "bg-white/20 text-white" 
                      : report.textViolations.length === 0
                        ? "bg-green-500/20 text-green-400 animate-pulse-subtle"
                        : report.textViolations.length >= 3
                          ? "bg-red-500/20 text-red-400 animate-pulse-subtle"
                          : "bg-amber-500/20 text-amber-400 animate-pulse-subtle"
                  }`}>
                    {report.textViolations.length === 0 ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : report.textViolations.length >= 3 ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    {report.textViolations.length} {report.textViolations.length === 1 ? "issue" : "issues"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main 
          className={`transition-all duration-700 delay-200 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative bg-white/5 backdrop-blur-md border border-white/20 rounded-[10px] overflow-hidden shadow-lg shadow-black/20">
            
            {/* Content */}
            <div className="relative p-5 sm:p-8">
              {/* Tab Content with Animation */}
              <div className={`transition-all duration-300 ${tabAnimating ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"}`}>
                {/* Analyze Tab Content */}
                {activeTab === "analyze" && (
                  <div className="animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-700/50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center border border-violet-500/20 animate-pulse-subtle">
                          <ScanSearch className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">Submit Content</h2>
                          <p className="text-sm text-slate-400">Upload your ad for compliance review</p>
                        </div>
                      </div>
                      {report && (
                        <button
                          onClick={() => handleTabChange("results")}
                          className="group flex items-center gap-2 px-5 py-2.5 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-sm text-slate-300 hover:text-white transition-all duration-300 border border-slate-600/50 hover:border-slate-500"
                        >
                          <FileBarChart className="w-4 h-4" />
                          View Last Results
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                        </button>
                      )}
                    </div>
                    <SubmissionForm onSubmit={handleSubmit} isLoading={isLoading} />
                  </div>
                )}

                {/* Results Tab Content */}
                {activeTab === "results" && report && (
                  <div className="animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-700/50">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                          report.status === "pass" 
                            ? "bg-green-500/20 border-green-500/20" 
                            : report.status === "fail" 
                              ? "bg-red-500/20 border-red-500/20" 
                              : "bg-amber-500/20 border-amber-500/20"
                        } ${report.status === "pass" ? "animate-success-pop" : report.status === "fail" ? "animate-error-shake" : "animate-pulse-subtle"}`}>
                          {report.status === "pass" ? (
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                          ) : report.status === "fail" ? (
                            <XCircle className="w-6 h-6 text-red-400" />
                          ) : (
                            <AlertTriangle className="w-6 h-6 text-amber-400" />
                          )}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">Compliance Report</h2>
                          <p className="text-sm text-slate-400">
                            {new Date(report.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleNewAnalysis}
                        className="group flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm text-white font-semibold transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105"
                      >
                        <Zap className="w-4 h-4" />
                        New Analysis
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </button>
                    </div>
                    <ComplianceReport report={report} onReset={handleReset} />
                  </div>
                )}

                {/* Empty Results State */}
                {activeTab === "results" && !report && (
                  <div className="text-center py-20 animate-fade-in-up">
                    <div className="w-20 h-20 mx-auto bg-slate-700/50 rounded-3xl flex items-center justify-center mb-6 animate-float">
                      <FileBarChart className="w-10 h-10 text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-300 mb-2">No Results Yet</h3>
                    <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
                      Submit your ad content to see detailed compliance results
                    </p>
                    <button
                      onClick={() => handleTabChange("analyze")}
                      className="group inline-flex items-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl text-white font-semibold transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105"
                    >
                      <ScanSearch className="w-5 h-5" />
                      Start Analysis
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer 
          className={`mt-10 sm:mt-12 text-center transition-all duration-700 delay-300 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <p className="text-xs sm:text-sm text-slate-500">
            Powered by <span className="text-violet-400">Gemini</span> & <span className="text-fuchsia-400">GPT-4o</span> • SightEngine Moderation
          </p>
          <p className="mt-1.5 text-xs text-slate-600">
            This tool provides guidance only. Consult compliance teams for final approval.
          </p>
        </footer>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes float-orb {
          0%, 100% { 
            transform: translateY(0) translateX(0) scale(1); 
            opacity: 0.08;
          }
          25% { 
            transform: translateY(-30px) translateX(15px) scale(1.05); 
            opacity: 0.12;
          }
          50% { 
            transform: translateY(-15px) translateX(-10px) scale(1.02); 
            opacity: 0.1;
          }
          75% { 
            transform: translateY(-40px) translateX(20px) scale(1.08); 
            opacity: 0.15;
          }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
          50% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.5); }
        }

        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes success-pop {
          0% { transform: scale(0.8); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        @keyframes error-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 4s linear infinite;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        .animate-success-pop {
          animation: success-pop 0.5s ease-out forwards;
        }

        .animate-error-shake {
          animation: error-shake 0.5s ease-out forwards;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
