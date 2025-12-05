"use client";

import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  Shield,
  Eye,
  Pill,
  Skull,
  Swords,
  Heart,
  Sparkles,
  Scan,
  Bot,
  Fingerprint,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { ComplianceReport as ComplianceReportType, Violation, ImageViolation, Severity, SightEngineModerationScores } from "../types";
import { PLATFORM_DISPLAY_NAMES, PRODUCT_CATEGORY_DISPLAY_NAMES } from "../constants/policies";

interface ComplianceReportProps {
  report: ComplianceReportType;
  onReset: () => void;
}

const SEVERITY_CONFIG: Record<Severity, { icon: typeof AlertCircle; color: string; bgColor: string; borderColor: string }> = {
  critical: {
    icon: XCircle,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  info: {
    icon: Info,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
};

function ScoreGauge({ score, status }: { score: number; status: "pass" | "fail" | "review" }) {
  const getColor = () => {
    if (status === "pass") return { stroke: "#22c55e", glow: "0 0 20px rgba(34, 197, 94, 0.5)" };
    if (status === "review") return { stroke: "#f59e0b", glow: "0 0 20px rgba(245, 158, 11, 0.5)" };
    return { stroke: "#ef4444", glow: "0 0 20px rgba(239, 68, 68, 0.5)" };
  };

  const { stroke, glow } = getColor();
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-40 h-40">
      <svg className="w-40 h-40 transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="80"
          cy="80"
          r="45"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-slate-700"
        />
        {/* Progress circle */}
        <circle
          cx="80"
          cy="80"
          r="45"
          stroke={stroke}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(${glow})`, transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color: stroke }}>
          {score}
        </span>
        <span className="text-xs text-slate-400 uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "pass" | "fail" | "review" }) {
  const config = {
    pass: {
      icon: CheckCircle,
      label: "APPROVED",
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500/30",
    },
    review: {
      icon: AlertCircle,
      label: "NEEDS REVIEW",
      color: "text-amber-400",
      bgColor: "bg-amber-500/20",
      borderColor: "border-amber-500/30",
    },
    fail: {
      icon: XCircle,
      label: "REJECTED",
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      borderColor: "border-red-500/30",
    },
  };

  const { icon: Icon, label, color, bgColor, borderColor } = config[status];

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${bgColor} ${borderColor} border ${color}`}>
      <Icon className="w-5 h-5" />
      <span className="font-bold tracking-wider text-sm">{label}</span>
    </div>
  );
}

function ViolationCard({ violation, index }: { violation: Violation; index: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const config = SEVERITY_CONFIG[violation.severity];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 hover:bg-white/5 transition-colors gap-2 sm:gap-4"
      >
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${config.bgColor} ${config.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold uppercase ${config.color}`}>
                {violation.severity}
              </span>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <span className="text-sm text-slate-300">{violation.category}</span>
            </div>
            <p className="text-sm text-slate-400 truncate max-w-full sm:max-w-md">
              {violation.policyReference}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 justify-between sm:justify-end pl-11 sm:pl-0">
          <span className="text-xs text-slate-500">
            {Math.round(violation.confidence * 100)}% confident
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50">
          <div className="pt-3">
            <p className="text-sm text-slate-300">{violation.policyDescription}</p>
          </div>

          {violation.offendingText && (
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Problematic Text:
              </div>
              <p className={`font-mono text-sm ${config.color} bg-slate-800/50 px-2 py-1 rounded inline-block`}>
                &quot;{violation.offendingText}&quot;
              </p>
            </div>
          )}

          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="text-xs text-green-400 mb-1 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />
              Suggested Fix:
            </div>
            <p className="text-sm text-green-300">{violation.suggestedFix}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ImageViolationCard({ violation }: { violation: ImageViolation }) {
  const config = SEVERITY_CONFIG[violation.severity];
  const Icon = config.icon;

  const issueTypeLabels: Record<string, string> = {
    before_after: "Before/After Comparison",
    nudity: "Nudity/Sensitive Content",
    negative_body_image: "Negative Body Imagery",
    graphic_content: "Graphic Content",
    misleading_imagery: "Misleading Imagery",
  };

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${config.bgColor} ${config.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-semibold uppercase ${config.color}`}>
              {violation.severity}
            </span>
            <span className="text-sm text-slate-300">
              {issueTypeLabels[violation.imageIssueType] || violation.imageIssueType}
            </span>
          </div>
          <p className="text-sm text-slate-400 mb-3">{violation.policyDescription}</p>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="text-xs text-green-400 mb-1 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />
              Suggested Fix:
            </div>
            <p className="text-sm text-green-300">{violation.suggestedFix}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModerationScoreBar({ 
  label, 
  score, 
  icon: Icon, 
  inverted = false 
}: { 
  label: string; 
  score: number; 
  icon: typeof Eye;
  inverted?: boolean;
}) {
  // For inverted scores (like "safe" scores), higher is better
  // For regular scores, lower is better
  const displayScore = Math.round(score * 100);
  const effectiveScore = inverted ? score : 1 - score;
  
  const getColor = () => {
    if (effectiveScore >= 0.8) return { bar: "bg-green-500", text: "text-green-400" };
    if (effectiveScore >= 0.5) return { bar: "bg-amber-500", text: "text-amber-400" };
    return { bar: "bg-red-500", text: "text-red-400" };
  };
  
  const { bar, text } = getColor();
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-slate-300">
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </div>
        <span className={`font-mono font-medium ${text}`}>
          {inverted ? `${displayScore}%` : `${displayScore}%`}
        </span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${bar} transition-all duration-500 rounded-full`}
          style={{ width: `${inverted ? displayScore : 100 - displayScore}%` }}
        />
      </div>
    </div>
  );
}

function ImageModerationScores({ 
  scores, 
  safetyScore 
}: { 
  scores: SightEngineModerationScores;
  safetyScore: number;
}) {
  // Calculate max nudity score for display
  const maxNudity = Math.max(
    scores.nudity.sexual_activity,
    scores.nudity.sexual_display,
    scores.nudity.erotica,
    scores.nudity.very_suggestive,
    scores.nudity.suggestive
  );

  const getSafetyColor = () => {
    if (safetyScore >= 80) return { stroke: "#22c55e", bg: "bg-green-500/20", border: "border-green-500/30", text: "text-green-400" };
    if (safetyScore >= 60) return { stroke: "#f59e0b", bg: "bg-amber-500/20", border: "border-amber-500/30", text: "text-amber-400" };
    return { stroke: "#ef4444", bg: "bg-red-500/20", border: "border-red-500/30", text: "text-red-400" };
  };

  const safetyConfig = getSafetyColor();

  return (
    <div className="space-y-6">
      {/* Safety Score Header */}
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl ${safetyConfig.bg} border ${safetyConfig.border}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 sm:w-12 h-10 sm:h-12 rounded-xl flex items-center justify-center ${safetyConfig.bg}`}>
            <Shield className={`w-5 sm:w-6 h-5 sm:h-6 ${safetyConfig.text}`} />
          </div>
          <div>
            <h4 className="font-semibold text-slate-200 text-sm sm:text-base">Image Safety Score</h4>
            <p className="text-xs sm:text-sm text-slate-400">Powered by SightEngine AI</p>
          </div>
        </div>
        <div className="text-center sm:text-right">
          <div className={`text-2xl sm:text-3xl font-bold ${safetyConfig.text}`}>{safetyScore}%</div>
          <div className="text-xs text-slate-500">
            {safetyScore >= 80 ? "Safe" : safetyScore >= 60 ? "Review Needed" : "Issues Detected"}
          </div>
        </div>
      </div>

      {/* Moderation Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <h5 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Content Analysis</h5>
          <div className="space-y-3 bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
            <ModerationScoreBar 
              label="Nudity/Sexual" 
              score={maxNudity} 
              icon={Eye}
            />
            <ModerationScoreBar 
              label="Violence" 
              score={scores.violence} 
              icon={Swords}
            />
            <ModerationScoreBar 
              label="Gore" 
              score={scores.gore} 
              icon={Skull}
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <h5 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Safety Checks</h5>
          <div className="space-y-3 bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
            <ModerationScoreBar 
              label="Recreational Drugs" 
              score={scores.recreational_drug} 
              icon={Pill}
            />
            <ModerationScoreBar 
              label="Self-Harm" 
              score={scores.self_harm} 
              icon={Heart}
            />
            <ModerationScoreBar 
              label="AI-Generated" 
              score={scores.ai_generated} 
              icon={Sparkles}
            />
          </div>
        </div>
      </div>

      {/* Detailed Nudity Breakdown (if any nudity detected) */}
      {maxNudity > 0.1 && (
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Nudity Breakdown</h5>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { label: "Sexual Activity", value: scores.nudity.sexual_activity },
              { label: "Sexual Display", value: scores.nudity.sexual_display },
              { label: "Erotica", value: scores.nudity.erotica },
              { label: "Very Suggestive", value: scores.nudity.very_suggestive },
              { label: "Suggestive", value: scores.nudity.suggestive },
            ].map((item) => {
              const percent = Math.round(item.value * 100);
              const color = percent < 20 ? "text-green-400" : percent < 50 ? "text-amber-400" : "text-red-400";
              return (
                <div key={item.label} className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className={`text-lg font-bold ${color}`}>{percent}%</div>
                  <div className="text-xs text-slate-500 mt-1">{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Safe Content Indicator */}
      {scores.nudity.none > 0.8 && maxNudity < 0.1 && scores.violence < 0.1 && scores.gore < 0.1 && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-sm text-green-300">Image content appears safe for advertising</span>
        </div>
      )}
    </div>
  );
}

function HighlightedText({ text, violations }: { text: string; violations: Violation[] }) {
  // Sort violations by start index
  const sortedViolations = [...violations]
    .filter((v) => v.startIndex !== undefined && v.endIndex !== undefined)
    .sort((a, b) => (a.startIndex || 0) - (b.startIndex || 0));

  if (sortedViolations.length === 0) {
    return <pre className="whitespace-pre-wrap text-sm text-slate-300">{text}</pre>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedViolations.forEach((violation, idx) => {
    const start = violation.startIndex || 0;
    const end = violation.endIndex || 0;

    // Add non-highlighted text before this violation
    if (start > lastIndex) {
      parts.push(
        <span key={`text-${idx}`}>{text.slice(lastIndex, start)}</span>
      );
    }

    // Add highlighted violation text
    const config = SEVERITY_CONFIG[violation.severity];
    parts.push(
      <mark
        key={`highlight-${idx}`}
        className={`${config.bgColor} ${config.color} px-1 rounded cursor-help`}
        title={`${violation.policyReference}: ${violation.suggestedFix}`}
      >
        {text.slice(start, end)}
      </mark>
    );

    lastIndex = end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key="text-end">{text.slice(lastIndex)}</span>);
  }

  return <pre className="whitespace-pre-wrap text-sm text-slate-300">{parts}</pre>;
}

export function ComplianceReport({ report, onReset }: ComplianceReportProps) {
  const totalViolations = report.textViolations.length + report.imageViolations.length;
  const criticalCount = [...report.textViolations, ...report.imageViolations].filter(
    (v) => v.severity === "critical"
  ).length;
  const warningCount = [...report.textViolations, ...report.imageViolations].filter(
    (v) => v.severity === "warning"
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Section */}
      <div className="flex flex-col items-center gap-6 p-4 sm:p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
        {/* Score and Status */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full">
          <ScoreGauge score={report.overallScore} status={report.status} />
          <div className="text-center sm:text-left">
            <StatusBadge status={report.status} />
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(report.timestamp).toLocaleString()}
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                {PLATFORM_DISPLAY_NAMES[report.platform]}
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-400">
              {PRODUCT_CATEGORY_DISPLAY_NAMES[report.productCategory]}
            </div>
          </div>
        </div>

        {/* Violation counts and action */}
        <div className="flex flex-col items-center sm:items-end gap-3 w-full pt-4 border-t border-slate-700/50 sm:border-0 sm:pt-0">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {criticalCount > 0 && (
              <div className="flex items-center gap-1 text-red-400">
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{criticalCount} Critical</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-1 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">{warningCount} Warnings</span>
              </div>
            )}
          </div>
          <p className="text-sm text-slate-400">
            {totalViolations} issue{totalViolations !== 1 ? "s" : ""} found
          </p>
          <button
            onClick={onReset}
            className="w-full sm:w-auto mt-2 px-4 py-2.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Check Another Ad
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-400 mb-2">Summary</h3>
        <p className="text-slate-300">{report.summary}</p>
      </div>

      {/* Original Text with Highlights */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
          <FileText className="w-5 h-5" />
          Analyzed Copy
        </h3>
        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 max-h-64 overflow-y-auto">
          <HighlightedText text={report.originalText} violations={report.textViolations} />
        </div>
      </div>

      {/* Image Preview with Violations */}
      {report.imageUrl && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
            <ImageIcon className="w-5 h-5" />
            Analyzed Image
          </h3>
          <div className="relative inline-block">
            <img
              src={report.imageUrl}
              alt="Analyzed creative"
              className="max-h-64 rounded-lg border border-slate-700"
            />
            {report.imageViolations.map((violation, idx) =>
              violation.imageRegion ? (
                <div
                  key={idx}
                  className="absolute border-2 border-red-500 bg-red-500/20 rounded"
                  style={{
                    left: `${violation.imageRegion.x}%`,
                    top: `${violation.imageRegion.y}%`,
                    width: `${violation.imageRegion.width}%`,
                    height: `${violation.imageRegion.height}%`,
                  }}
                  title={violation.policyDescription}
                />
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Image Moderation Scores (SightEngine) */}
      {report.imageModerationScores && report.imageSafetyScore !== undefined && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
            <Shield className="w-5 h-5 text-violet-400" />
            Image Moderation Analysis
          </h3>
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
            <ImageModerationScores 
              scores={report.imageModerationScores} 
              safetyScore={report.imageSafetyScore} 
            />
          </div>
        </div>
      )}

      {/* Text Violations */}
      {report.textViolations.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
            <AlertCircle className="w-5 h-5" />
            Text Violations ({report.textViolations.length})
          </h3>
          <div className="space-y-3">
            {report.textViolations.map((violation, idx) => (
              <ViolationCard key={violation.id} violation={violation} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Image Violations */}
      {report.imageViolations.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
            <ImageIcon className="w-5 h-5" />
            Image Violations ({report.imageViolations.length})
          </h3>
          <div className="space-y-3">
            {report.imageViolations.map((violation) => (
              <ImageViolationCard key={violation.id} violation={violation} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            Recommendations
          </h3>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <ul className="space-y-2">
              {report.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-amber-400 mt-1">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* No Issues Found */}
      {totalViolations === 0 && (
        <div className="text-center p-8 bg-green-500/10 border border-green-500/20 rounded-lg">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-400 mb-2">All Clear!</h3>
          <p className="text-slate-300">
            No compliance issues were detected in your ad content.
          </p>
        </div>
      )}
    </div>
  );
}

