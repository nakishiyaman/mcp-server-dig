/**
 * Pure scoring function for file stability prediction.
 * Combines revert ratio, churn trend, code age, and conflict frequency
 * into a single stability score (0-100).
 */

import type { RiskLevel } from "./risk-classifiers.js";

export interface StabilitySignals {
  revertRatio: number;     // reverts / total commits for this file (0-1)
  churnTrendRatio: number; // recent churn / older churn (0+)
  codeAgeDays: number;     // days since last change
  conflictRatio: number;   // merge appearances / total merges (0-1)
}

export interface StabilityResult {
  score: number;
  riskLevel: RiskLevel;
  penalties: {
    revert: number;
    churnTrend: number;
    codeAge: number;
    conflict: number;
  };
}

/**
 * Predict file stability from 4 signals.
 * Score starts at 100 and is reduced by penalties.
 *
 * - Revert ratio penalty: up to 30 points
 * - Churn trend penalty: up to 25 points
 * - Code age penalty (too young = unstable): up to 20 points
 * - Conflict frequency penalty: up to 25 points
 */
export function predictStability(signals: StabilitySignals): StabilityResult {
  // Revert penalty: 0-30 points, scaled by ratio
  const revertPenalty = Math.min(30, signals.revertRatio * 600);

  // Churn trend penalty: 0-25 points
  // ratio > 1 means increasing churn (unstable)
  const churnExcess = Math.max(0, signals.churnTrendRatio - 1);
  const churnPenalty = Math.min(25, churnExcess * 25);

  // Code age penalty: very recently changed code is less stable
  // < 7 days: 20pts, < 30 days: 10pts, < 90 days: 5pts, >= 90 days: 0pts
  let agePenalty = 0;
  if (signals.codeAgeDays < 7) {
    agePenalty = 20;
  } else if (signals.codeAgeDays < 30) {
    agePenalty = 10;
  } else if (signals.codeAgeDays < 90) {
    agePenalty = 5;
  }

  // Conflict penalty: 0-25 points
  const conflictPenalty = Math.min(25, signals.conflictRatio * 500);

  const rawScore = 100 - revertPenalty - churnPenalty - agePenalty - conflictPenalty;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let riskLevel: RiskLevel;
  if (score >= 70) {
    riskLevel = "LOW";
  } else if (score >= 40) {
    riskLevel = "MEDIUM";
  } else {
    riskLevel = "HIGH";
  }

  return {
    score,
    riskLevel,
    penalties: {
      revert: Math.round(revertPenalty),
      churnTrend: Math.round(churnPenalty),
      codeAge: agePenalty,
      conflict: Math.round(conflictPenalty),
    },
  };
}
