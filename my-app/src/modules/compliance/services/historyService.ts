// History Service - Manages compliance check history in localStorage

import type { ComplianceReport } from "../types";

const HISTORY_KEY = "agartha_compliance_history";
const MAX_HISTORY_ITEMS = 50; // Keep last 50 results

export interface HistoryItem {
  id: string;
  timestamp: string;
  platform: string;
  productCategory: string;
  overallScore: number;
  status: "pass" | "fail" | "review";
  totalViolations: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  // Store summary for quick preview
  summary: string;
  // Store the full report for viewing details
  fullReport: ComplianceReport;
}

/**
 * Get all history items from localStorage
 */
export function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as HistoryItem[];
  } catch (error) {
    console.error("Failed to load history:", error);
    return [];
  }
}

/**
 * Add a new report to history
 */
export function addToHistory(report: ComplianceReport): HistoryItem {
  const history = getHistory();
  
  // Calculate violation counts
  const allViolations = [
    ...report.textViolations,
    ...report.imageViolations,
    ...(report.imageTextViolations || []),
  ];
  
  const criticalCount = allViolations.filter(v => v.severity === "critical").length;
  const warningCount = allViolations.filter(v => v.severity === "warning").length;
  const infoCount = allViolations.filter(v => v.severity === "info").length;
  
  const historyItem: HistoryItem = {
    id: report.id,
    timestamp: report.timestamp,
    platform: report.platform,
    productCategory: report.productCategory,
    overallScore: report.overallScore,
    status: report.status,
    totalViolations: allViolations.length,
    criticalCount,
    warningCount,
    infoCount,
    summary: report.summary,
    fullReport: report,
  };
  
  // Add to beginning of array (most recent first)
  const updatedHistory = [historyItem, ...history];
  
  // Keep only the last MAX_HISTORY_ITEMS
  const trimmedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);
  
  // Save to localStorage
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error("Failed to save history:", error);
  }
  
  return historyItem;
}

/**
 * Get a specific history item by ID
 */
export function getHistoryItem(id: string): HistoryItem | null {
  const history = getHistory();
  return history.find(item => item.id === id) || null;
}

/**
 * Delete a specific history item
 */
export function deleteHistoryItem(id: string): void {
  const history = getHistory();
  const filtered = history.filter(item => item.id !== id);
  
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete history item:", error);
  }
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error("Failed to clear history:", error);
  }
}

/**
 * Get history statistics
 */
export function getHistoryStats(): {
  totalChecks: number;
  passRate: number;
  avgScore: number;
  recentTrend: "improving" | "declining" | "stable";
} {
  const history = getHistory();
  
  if (history.length === 0) {
    return {
      totalChecks: 0,
      passRate: 0,
      avgScore: 0,
      recentTrend: "stable",
    };
  }
  
  const totalChecks = history.length;
  const passCount = history.filter(h => h.status === "pass").length;
  const passRate = Math.round((passCount / totalChecks) * 100);
  const avgScore = Math.round(history.reduce((sum, h) => sum + h.overallScore, 0) / totalChecks);
  
  // Calculate trend based on score progression over time
  // History is sorted newest first, so we need to look at it in reverse for chronological order
  let recentTrend: "improving" | "declining" | "stable" = "stable";
  
  if (history.length >= 2) {
    // Compare first half (older) vs second half (newer) of history
    // But limit to last 10 items for meaningful comparison
    const relevantHistory = history.slice(0, Math.min(10, history.length));
    
    if (relevantHistory.length >= 2) {
      const midpoint = Math.floor(relevantHistory.length / 2);
      
      // Recent items (newer - at the start of array)
      const recentItems = relevantHistory.slice(0, midpoint);
      // Older items (older - at the end of array)
      const olderItems = relevantHistory.slice(midpoint);
      
      const avgRecentScore = recentItems.reduce((sum, h) => sum + h.overallScore, 0) / recentItems.length;
      const avgOlderScore = olderItems.reduce((sum, h) => sum + h.overallScore, 0) / olderItems.length;
      
      // Also consider pass rates
      const recentPassRate = recentItems.filter(h => h.status === "pass").length / recentItems.length;
      const olderPassRate = olderItems.filter(h => h.status === "pass").length / olderItems.length;
      
      // Calculate combined trend score (weight score difference + pass rate difference)
      const scoreDiff = avgRecentScore - avgOlderScore;
      const passRateDiff = (recentPassRate - olderPassRate) * 100; // Convert to percentage points
      
      // Combined metric: score improvement + pass rate improvement
      const trendScore = scoreDiff + (passRateDiff * 0.5);
      
      // Thresholds for determining trend
      if (trendScore >= 5) {
        recentTrend = "improving";
      } else if (trendScore <= -5) {
        recentTrend = "declining";
      }
    }
  }
  
  return { totalChecks, passRate, avgScore, recentTrend };
}

