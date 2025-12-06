"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Shield, 
  Sparkles, 
  ArrowRight, 
  Zap, 
  Lock, 
  BarChart3,
  ChevronRight,
  Brain,
  Layers
} from "lucide-react";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Animated orbs background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)",
            top: "-200px",
            right: "-100px",
            animation: "float 20s ease-in-out infinite",
          }}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.5) 0%, transparent 70%)",
            bottom: "-150px",
            left: "-100px",
            animation: "float 25s ease-in-out infinite reverse",
          }}
        />
        <div 
          className="absolute w-[300px] h-[300px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, transparent 70%)",
            top: "40%",
            left: "60%",
            animation: "float 15s ease-in-out infinite",
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-white tracking-tight">Agartha AI</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link 
              href="/agartha" 
              className="hidden sm:block px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              Products
            </Link>
            <Link 
              href="/agartha" 
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 rounded-[10px] text-xs sm:text-sm font-medium text-white transition-all hover:scale-105 shadow-lg shadow-black/10"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-4 sm:px-6 pt-8 sm:pt-16 pb-16 sm:pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div 
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-6 sm:mb-8 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
              <span className="text-xs sm:text-sm text-violet-300">Intelligent Compliance Automation</span>
            </div>

            {/* Headline */}
            <h1 
              className={`text-3xl sm:text-5xl lg:text-7xl font-bold leading-[1.15] sm:leading-[1.1] mb-4 sm:mb-6 transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
              <span className="text-white">AI-Powered </span>
              <span className="text-violet-400">
                Compliance
              </span>
              <br />
              <span className="text-white">for Modern Business</span>
            </h1>

            {/* Subheadline */}
            <p 
              className={`text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto mb-8 sm:mb-10 px-2 transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
              Automate regulatory compliance with cutting-edge AI. 
              From healthcare advertising to financial services, we keep you compliant.
            </p>

            {/* CTA Buttons */}
            <div 
              className={`flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
              <Link 
                href="/agartha"
                className="group w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-violet-600 hover:bg-violet-500 rounded-xl sm:rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg shadow-violet-500/25"
              >
                Try Healthcare Compliance
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl sm:rounded-2xl text-white font-semibold transition-all hover:scale-105">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Healthcare Compliance Card - Primary */}
            <Link 
              href="/agartha"
              className={`group relative bg-white/10 backdrop-blur-md border border-white/20 rounded-[10px] p-5 sm:p-8 hover:border-violet-500/40 hover:bg-white/15 transition-all duration-500 hover:scale-[1.02] cursor-pointer shadow-lg shadow-black/10 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: "400ms" }}
            >
              <div className="absolute inset-0 bg-violet-500/5 rounded-[10px] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-violet-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-violet-500/20">
                  <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">Live</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Healthcare Ad Compliance</h3>
                <p className="text-sm sm:text-base text-slate-400 mb-4 sm:mb-6">
                  Instant compliance checking for healthcare marketing content across Meta, Google & TikTok platforms.
                </p>
                <div className="flex items-center text-violet-400 font-medium group-hover:text-violet-300">
                  Launch Tool
                  <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Financial Compliance Card */}
            <div 
              className={`relative bg-white/5 backdrop-blur-md border border-white/20 rounded-[10px] p-5 sm:p-8 transition-all duration-500 shadow-lg shadow-black/10 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: "500ms" }}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-700/50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400" />
              </div>
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <span className="px-2 py-1 bg-slate-700 text-slate-400 text-xs font-medium rounded-full">Coming Soon</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Financial Services</h3>
              <p className="text-sm sm:text-base text-slate-500">
                SEC, FINRA, and regulatory compliance automation for investment advisors and financial institutions.
              </p>
            </div>

            {/* Data Privacy Card */}
            <div 
              className={`relative bg-white/5 backdrop-blur-md border border-white/20 rounded-[10px] p-5 sm:p-8 transition-all duration-500 shadow-lg shadow-black/10 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: "600ms" }}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-700/50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400" />
              </div>
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <span className="px-2 py-1 bg-slate-700 text-slate-400 text-xs font-medium rounded-full">Coming Soon</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Data Privacy</h3>
              <p className="text-sm sm:text-base text-slate-500">
                GDPR, CCPA, and HIPAA compliance monitoring with automated policy enforcement and audit trails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto">
          <div 
            className={`bg-white/5 backdrop-blur-md border border-white/20 rounded-[10px] p-6 sm:p-12 transition-all duration-700 shadow-lg shadow-black/10 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            style={{ transitionDelay: "700ms" }}
          >
            <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center">
              <div>
                <div className="text-2xl sm:text-4xl lg:text-5xl font-bold text-violet-400 mb-1 sm:mb-2">
                  25+
                </div>
                <p className="text-xs sm:text-base text-slate-400">Policy Rules</p>
              </div>
              <div>
                <div className="text-2xl sm:text-4xl lg:text-5xl font-bold text-violet-400 mb-1 sm:mb-2">
                  3
                </div>
                <p className="text-xs sm:text-base text-slate-400">Platforms</p>
              </div>
              <div>
                <div className="text-2xl sm:text-4xl lg:text-5xl font-bold text-violet-400 mb-1 sm:mb-2">
                  &lt;10s
                </div>
                <p className="text-xs sm:text-base text-slate-400">Analysis</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 
              className={`text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: "800ms" }}
            >
              How It Works
            </h2>
            <p 
              className={`text-sm sm:text-base text-slate-400 max-w-xl mx-auto transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: "850ms" }}
            >
              Three simple steps to ensure your content is compliant
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {[
              { icon: Layers, title: "Upload Content", desc: "Submit your marketing copy and creative assets" },
              { icon: Zap, title: "AI Analysis", desc: "Gemini analyzes against platform policies" },
              { icon: Shield, title: "Get Results", desc: "Receive detailed compliance report with fixes" },
            ].map((step, i) => (
              <div 
                key={i}
                className={`text-center transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${900 + i * 100}ms` }}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto bg-white/10 backdrop-blur-md border border-white/20 rounded-[10px] flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-black/10">
                  <step.icon className="w-6 h-6 sm:w-8 sm:h-8 text-violet-400" />
                </div>
                <div className="text-xs sm:text-sm text-violet-400 font-medium mb-1 sm:mb-2">Step {i + 1}</div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2">{step.title}</h3>
                <p className="text-sm sm:text-base text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div 
            className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-[10px] p-6 sm:p-12 transition-all duration-700 shadow-lg shadow-black/10 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            style={{ transitionDelay: "1200ms" }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
              Ready to Automate Compliance?
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mb-6 sm:mb-8 max-w-xl mx-auto">
              Start checking your healthcare ads for policy violations in seconds. No signup required.
            </p>
            <Link 
              href="/agartha"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white text-slate-900 font-semibold rounded-xl sm:rounded-2xl hover:bg-slate-100 transition-all hover:scale-105"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-6 py-8 sm:py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4 text-center sm:text-left sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
            <span className="text-sm sm:text-base text-slate-400">© 2024 Agartha AI</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-500">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
