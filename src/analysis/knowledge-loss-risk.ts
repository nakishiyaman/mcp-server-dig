import {
  analyzeKnowledgeMap,
  type KnowledgeMapOptions,
} from "./knowledge-map.js";

export interface AuthorOwnership {
  directory: string;
  ownershipPercentage: number;
  commits: number;
  totalCommits: number;
  busFactor: number;
}

export interface KnowledgeLossRiskResult {
  author: string;
  totalOwnedDirectories: number;
  soleOwnerDirectories: number;
  highRiskDirectories: AuthorOwnership[];
  mediumRiskDirectories: AuthorOwnership[];
  lowRiskDirectories: AuthorOwnership[];
  recoveryCost: "HIGH" | "MEDIUM" | "LOW";
}

export interface KnowledgeLossRiskOptions {
  targetAuthor?: string;
  depth?: number;
  since?: string;
  maxCommits?: number;
  minOwnershipPct?: number;
  timeoutMs?: number;
}

/**
 * Analyze knowledge loss risk: what happens when a contributor leaves.
 *
 * Combines knowledge map (bus factor per directory) with contributor analysis
 * to identify directories where a specific author (or any author) represents
 * a single point of failure.
 */
export async function analyzeKnowledgeLossRisk(
  repoPath: string,
  options: KnowledgeLossRiskOptions = {},
): Promise<KnowledgeLossRiskResult[]> {
  const {
    targetAuthor,
    depth = 1,
    since,
    maxCommits = 500,
    minOwnershipPct = 30,
    timeoutMs,
  } = options;

  const kmOptions: KnowledgeMapOptions = {
    depth,
    since,
    maxCommits,
    timeoutMs,
  };

  const knowledgeMap = await analyzeKnowledgeMap(repoPath, kmOptions);

  if (knowledgeMap.length === 0) return [];

  // Build author->directory ownership map
  const authorMap = new Map<string, AuthorOwnership[]>();

  for (const dir of knowledgeMap) {
    for (const contrib of dir.contributors) {
      if (contrib.percentage < minOwnershipPct) continue;
      if (targetAuthor && !matchesAuthor(contrib.email, targetAuthor)) continue;

      const ownership: AuthorOwnership = {
        directory: dir.directory,
        ownershipPercentage: contrib.percentage,
        commits: contrib.commits,
        totalCommits: dir.totalCommits,
        busFactor: dir.busFactor,
      };

      const existing = authorMap.get(contrib.email) ?? [];
      existing.push(ownership);
      authorMap.set(contrib.email, existing);
    }
  }

  const results: KnowledgeLossRiskResult[] = [];

  for (const [email, ownerships] of authorMap) {
    const high: AuthorOwnership[] = [];
    const medium: AuthorOwnership[] = [];
    const low: AuthorOwnership[] = [];

    for (const o of ownerships) {
      if (o.busFactor === 1 && o.ownershipPercentage >= 50) {
        high.push(o);
      } else if (o.busFactor <= 2 && o.ownershipPercentage >= 50) {
        medium.push(o);
      } else {
        low.push(o);
      }
    }

    const soleOwnerDirs = ownerships.filter(
      (o) => o.busFactor === 1 && o.ownershipPercentage >= 50,
    ).length;

    const recoveryCost = classifyRecoveryCost(high.length, medium.length);

    results.push({
      author: email,
      totalOwnedDirectories: ownerships.length,
      soleOwnerDirectories: soleOwnerDirs,
      highRiskDirectories: high,
      mediumRiskDirectories: medium,
      lowRiskDirectories: low,
      recoveryCost,
    });
  }

  // Sort by recovery cost (HIGH first) then by sole owner directories count
  return results.sort((a, b) => {
    const costOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const costDiff = costOrder[a.recoveryCost] - costOrder[b.recoveryCost];
    if (costDiff !== 0) return costDiff;
    return b.soleOwnerDirectories - a.soleOwnerDirectories;
  });
}

function matchesAuthor(email: string, target: string): boolean {
  const t = target.toLowerCase();
  return email.toLowerCase().includes(t);
}

function classifyRecoveryCost(
  highCount: number,
  mediumCount: number,
): "HIGH" | "MEDIUM" | "LOW" {
  if (highCount >= 3) return "HIGH";
  if (highCount >= 1 && mediumCount >= 1) return "HIGH";
  if (highCount >= 1 || mediumCount >= 3) return "MEDIUM";
  if (mediumCount >= 1) return "MEDIUM";
  return "LOW";
}
