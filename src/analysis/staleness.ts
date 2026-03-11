import { execGit } from "../git/executor.js";

export async function analyzeFileStaleness(
  repoPath: string,
  filePath: string,
): Promise<{ lastModified: string; daysSinceLastChange: number }> {
  const dateOutput = await execGit(
    ["log", "--format=%aI", "--max-count=1", "--", filePath],
    repoPath,
  );
  const lastModified = dateOutput.trim();

  if (!lastModified) {
    return { lastModified: "unknown", daysSinceLastChange: -1 };
  }

  const modMs = new Date(lastModified).getTime();
  const nowMs = Date.now();
  const daysSinceLastChange = Math.floor(
    (nowMs - modMs) / (1000 * 60 * 60 * 24),
  );

  return { lastModified: lastModified.slice(0, 10), daysSinceLastChange };
}
