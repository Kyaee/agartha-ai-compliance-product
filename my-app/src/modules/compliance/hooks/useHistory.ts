"use client";

import { useState, useEffect, useCallback } from "react";
import type { ComplianceReport } from "../types";
import {
  getHistory,
  addToHistory,
  deleteHistoryItem,
  clearHistory,
  getHistoryStats,
  type HistoryItem,
} from "../services/historyService";

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({
    totalChecks: 0,
    passRate: 0,
    avgScore: 0,
    recentTrend: "stable" as "improving" | "declining" | "stable",
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load history on mount
  useEffect(() => {
    setHistory(getHistory());
    setStats(getHistoryStats());
    setIsLoading(false);
  }, []);

  // Add a report to history
  const addReport = useCallback((report: ComplianceReport) => {
    const newItem = addToHistory(report);
    setHistory(prev => [newItem, ...prev.slice(0, 49)]);
    setStats(getHistoryStats());
    return newItem;
  }, []);

  // Delete a history item
  const deleteItem = useCallback((id: string) => {
    deleteHistoryItem(id);
    setHistory(prev => prev.filter(item => item.id !== id));
    setStats(getHistoryStats());
  }, []);

  // Clear all history
  const clearAll = useCallback(() => {
    clearHistory();
    setHistory([]);
    setStats({
      totalChecks: 0,
      passRate: 0,
      avgScore: 0,
      recentTrend: "stable",
    });
  }, []);

  // Refresh history from localStorage
  const refresh = useCallback(() => {
    setHistory(getHistory());
    setStats(getHistoryStats());
  }, []);

  return {
    history,
    stats,
    isLoading,
    addReport,
    deleteItem,
    clearAll,
    refresh,
  };
}

