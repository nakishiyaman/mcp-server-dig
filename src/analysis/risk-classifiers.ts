/**
 * Shared risk classification functions.
 * Extracted from tool-level local functions to enable direct unit testing.
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RiskDimension {
  level: RiskLevel;
  detail: string;
}

export function classifyChangeFrequency(
  fileChanges: number,
  allHotspots: { changeCount: number }[],
): RiskDimension {
  if (allHotspots.length === 0 || fileChanges === 0) {
    return { level: "LOW", detail: "no changes found" };
  }

  const maxChanges = allHotspots[0].changeCount;
  const ratio = fileChanges / maxChanges;

  if (ratio >= 0.5) {
    const rank = allHotspots.findIndex((h) => h.changeCount <= fileChanges) + 1;
    const percentile = Math.round((1 - rank / allHotspots.length) * 100);
    return {
      level: "HIGH",
      detail: `${fileChanges} changes, top ${Math.max(percentile, 1)}%`,
    };
  }
  if (ratio >= 0.2) {
    return { level: "MEDIUM", detail: `${fileChanges} changes` };
  }
  return { level: "LOW", detail: `${fileChanges} changes` };
}

export function classifyChurn(
  fileChurn: number,
  allChurn: { totalChurn: number }[],
): RiskDimension {
  if (allChurn.length === 0 || fileChurn === 0) {
    return { level: "LOW", detail: "no churn" };
  }

  const maxChurn = allChurn[0].totalChurn;
  const ratio = fileChurn / maxChurn;

  if (ratio >= 0.5) {
    return {
      level: "HIGH",
      detail: `${fileChurn.toLocaleString()} lines churned`,
    };
  }
  if (ratio >= 0.2) {
    return {
      level: "MEDIUM",
      detail: `${fileChurn.toLocaleString()} lines churned`,
    };
  }
  return {
    level: "LOW",
    detail: `${fileChurn.toLocaleString()} lines churned`,
  };
}

export function classifyKnowledgeRisk(
  contributorCount: number,
  topContributorPercentage: number,
): RiskDimension {
  if (contributorCount <= 1) {
    return {
      level: "HIGH",
      detail: `${contributorCount} contributor (single point of failure)`,
    };
  }
  if (topContributorPercentage >= 80) {
    return {
      level: "HIGH",
      detail: `${contributorCount} contributors, top owns ${topContributorPercentage}%`,
    };
  }
  if (contributorCount <= 2 || topContributorPercentage >= 60) {
    return {
      level: "MEDIUM",
      detail: `${contributorCount} contributors, top owns ${topContributorPercentage}%`,
    };
  }
  return {
    level: "LOW",
    detail: `${contributorCount} contributors, top owns ${topContributorPercentage}%`,
  };
}

export function classifyCoupling(coChangeCount: number): RiskDimension {
  if (coChangeCount >= 10) {
    return {
      level: "HIGH",
      detail: `${coChangeCount} co-changed files`,
    };
  }
  if (coChangeCount >= 5) {
    return {
      level: "MEDIUM",
      detail: `${coChangeCount} co-changed files`,
    };
  }
  return {
    level: "LOW",
    detail: `${coChangeCount} co-changed files`,
  };
}

export function classifyStaleness(daysSinceLastChange: number): RiskDimension {
  if (daysSinceLastChange < 0) {
    return { level: "LOW", detail: "unknown" };
  }
  if (daysSinceLastChange <= 30) {
    return {
      level: "LOW",
      detail: `last changed ${daysSinceLastChange} days ago`,
    };
  }
  if (daysSinceLastChange <= 180) {
    return {
      level: "MEDIUM",
      detail: `last changed ${daysSinceLastChange} days ago`,
    };
  }
  return {
    level: "HIGH",
    detail: `last changed ${daysSinceLastChange} days ago`,
  };
}

export function overallRisk(dimensions: RiskDimension[]): RiskLevel {
  const highCount = dimensions.filter((d) => d.level === "HIGH").length;
  const mediumCount = dimensions.filter((d) => d.level === "MEDIUM").length;

  if (highCount >= 3) return "HIGH";
  if (highCount >= 1 && mediumCount >= 1) return "HIGH";
  if (highCount >= 1 || mediumCount >= 3) return "MEDIUM";
  if (mediumCount >= 1) return "MEDIUM";
  return "LOW";
}

export function riskLabel(level: RiskLevel): string {
  switch (level) {
    case "HIGH":
      return "HIGH RISK";
    case "MEDIUM":
      return "MEDIUM RISK";
    case "LOW":
      return "LOW RISK";
  }
}

export function classifyConflictFrequency(
  mergeAppearances: number,
  totalMerges: number,
): RiskDimension {
  if (totalMerges === 0 || mergeAppearances === 0) {
    return { level: "LOW", detail: "no merge appearances" };
  }

  const percentage = Math.round((mergeAppearances / totalMerges) * 100);

  if (percentage >= 20) {
    return {
      level: "HIGH",
      detail: `${mergeAppearances} merges (${percentage}%)`,
    };
  }
  if (percentage >= 10) {
    return {
      level: "MEDIUM",
      detail: `${mergeAppearances} merges (${percentage}%)`,
    };
  }
  return {
    level: "LOW",
    detail: `${mergeAppearances} merges (${percentage}%)`,
  };
}

export function classifyCoordinationCost(
  score: number,
  allScores: number[],
): RiskLevel {
  if (allScores.length === 0 || score === 0) return "LOW";

  const maxScore = Math.max(...allScores);
  if (maxScore === 0) return "LOW";

  const ratio = score / maxScore;

  if (ratio >= 0.5) return "HIGH";
  if (ratio >= 0.2) return "MEDIUM";
  return "LOW";
}

/**
 * Classify expertise decay risk for a directory.
 *
 * @param busFactor - number of contributors needed to cover 50% of commits
 * @param activeOwnerCount - number of currently active owners
 * @param totalOwnerCount - total number of owners
 */
export function classifyExpertiseDecay(
  busFactor: number,
  activeOwnerCount: number,
  totalOwnerCount: number,
): RiskLevel {
  if (totalOwnerCount === 0) return "HIGH";

  // HIGH: busFactor<=1 and no active owners, or busFactor<=2 and all inactive
  if (busFactor <= 1 && activeOwnerCount === 0) return "HIGH";
  if (busFactor <= 2 && activeOwnerCount === 0) return "HIGH";

  // MEDIUM: some inactive owners but active owners remain, or busFactor<=2 with fading
  if (activeOwnerCount < totalOwnerCount && activeOwnerCount > 0 && busFactor <= 2) return "MEDIUM";
  if (activeOwnerCount < totalOwnerCount && activeOwnerCount > 0) return "MEDIUM";

  // LOW: all owners active
  return "LOW";
}

export function classifyIntegrationStyle(
  mergeRatio: number,
  mergesPerWeek: number,
): string {
  if (mergeRatio === 0) return "linear (no merges)";
  if (mergesPerWeek >= 5 && mergeRatio >= 0.2) return "continuous integration";
  if (mergesPerWeek >= 1) return "regular merging";
  return "batch merging";
}
