import { describe, it, expect } from "vitest";
import {
  classifyChangeFrequency,
  classifyChurn,
  classifyKnowledgeRisk,
  classifyCoupling,
  classifyStaleness,
  classifyConflictFrequency,
  overallRisk,
  riskLabel,
  classifyIntegrationStyle,
} from "./risk-classifiers.js";
import type { RiskDimension } from "./risk-classifiers.js";

describe("classifyChangeFrequency", () => {
  it("空のhotspotsでLOWを返す", () => {
    const result = classifyChangeFrequency(5, []);
    expect(result.level).toBe("LOW");
    expect(result.detail).toBe("no changes found");
  });

  it("fileChanges=0でLOWを返す", () => {
    const result = classifyChangeFrequency(0, [{ changeCount: 10 }]);
    expect(result.level).toBe("LOW");
  });

  it("ratio>=0.5でHIGHを返す", () => {
    const hotspots = [{ changeCount: 10 }, { changeCount: 8 }, { changeCount: 5 }];
    const result = classifyChangeFrequency(5, hotspots);
    expect(result.level).toBe("HIGH");
    expect(result.detail).toMatch(/top \d+%/);
  });

  it("ratio>=0.2かつ<0.5でMEDIUMを返す", () => {
    const hotspots = [{ changeCount: 10 }];
    const result = classifyChangeFrequency(3, hotspots);
    expect(result.level).toBe("MEDIUM");
  });

  it("ratio<0.2でLOWを返す", () => {
    const hotspots = [{ changeCount: 100 }];
    const result = classifyChangeFrequency(10, hotspots);
    expect(result.level).toBe("LOW");
    expect(result.detail).toBe("10 changes");
  });

  it("percentileが最低1%になる", () => {
    const hotspots = [{ changeCount: 10 }];
    const result = classifyChangeFrequency(10, hotspots);
    expect(result.level).toBe("HIGH");
    expect(result.detail).toContain("top 1%");
  });
});

describe("classifyChurn", () => {
  it("空のchurnでLOWを返す", () => {
    const result = classifyChurn(5, []);
    expect(result.level).toBe("LOW");
    expect(result.detail).toBe("no churn");
  });

  it("fileChurn=0でLOWを返す", () => {
    const result = classifyChurn(0, [{ totalChurn: 100 }]);
    expect(result.level).toBe("LOW");
  });

  it("ratio>=0.5でHIGHを返す", () => {
    const result = classifyChurn(50, [{ totalChurn: 100 }]);
    expect(result.level).toBe("HIGH");
    expect(result.detail).toContain("lines churned");
  });

  it("ratio>=0.2かつ<0.5でMEDIUMを返す", () => {
    const result = classifyChurn(25, [{ totalChurn: 100 }]);
    expect(result.level).toBe("MEDIUM");
  });

  it("ratio<0.2でLOWを返す", () => {
    const result = classifyChurn(10, [{ totalChurn: 100 }]);
    expect(result.level).toBe("LOW");
    expect(result.detail).toContain("lines churned");
  });
});

describe("classifyKnowledgeRisk", () => {
  it("contributor=0でHIGHを返す", () => {
    const result = classifyKnowledgeRisk(0, 0);
    expect(result.level).toBe("HIGH");
    expect(result.detail).toContain("single point of failure");
  });

  it("contributor=1でHIGHを返す", () => {
    const result = classifyKnowledgeRisk(1, 100);
    expect(result.level).toBe("HIGH");
  });

  it("topContributor>=80%でHIGHを返す", () => {
    const result = classifyKnowledgeRisk(3, 85);
    expect(result.level).toBe("HIGH");
  });

  it("contributor=2でMEDIUMを返す", () => {
    const result = classifyKnowledgeRisk(2, 50);
    expect(result.level).toBe("MEDIUM");
  });

  it("topContributor>=60%でMEDIUMを返す", () => {
    const result = classifyKnowledgeRisk(3, 70);
    expect(result.level).toBe("MEDIUM");
  });

  it("contributor>2かつtopContributor<60%でLOWを返す", () => {
    const result = classifyKnowledgeRisk(5, 40);
    expect(result.level).toBe("LOW");
  });
});

describe("classifyCoupling", () => {
  it("coChangeCount>=10でHIGHを返す", () => {
    expect(classifyCoupling(10).level).toBe("HIGH");
    expect(classifyCoupling(15).level).toBe("HIGH");
  });

  it("coChangeCount>=5かつ<10でMEDIUMを返す", () => {
    expect(classifyCoupling(5).level).toBe("MEDIUM");
    expect(classifyCoupling(9).level).toBe("MEDIUM");
  });

  it("coChangeCount<5でLOWを返す", () => {
    expect(classifyCoupling(0).level).toBe("LOW");
    expect(classifyCoupling(4).level).toBe("LOW");
  });
});

describe("classifyStaleness", () => {
  it("負の値でLOW（unknown）を返す", () => {
    const result = classifyStaleness(-1);
    expect(result.level).toBe("LOW");
    expect(result.detail).toBe("unknown");
  });

  it("30日以内でLOWを返す", () => {
    expect(classifyStaleness(0).level).toBe("LOW");
    expect(classifyStaleness(30).level).toBe("LOW");
  });

  it("31-180日でMEDIUMを返す", () => {
    expect(classifyStaleness(31).level).toBe("MEDIUM");
    expect(classifyStaleness(180).level).toBe("MEDIUM");
  });

  it("181日以上でHIGHを返す", () => {
    expect(classifyStaleness(181).level).toBe("HIGH");
    expect(classifyStaleness(365).level).toBe("HIGH");
  });
});

describe("overallRisk", () => {
  function dim(level: "LOW" | "MEDIUM" | "HIGH"): RiskDimension {
    return { level, detail: "test" };
  }

  it("HIGH 3個以上でHIGHを返す", () => {
    expect(overallRisk([dim("HIGH"), dim("HIGH"), dim("HIGH")])).toBe("HIGH");
  });

  it("HIGH 1個+MEDIUM 1個でHIGHを返す", () => {
    expect(overallRisk([dim("HIGH"), dim("MEDIUM"), dim("LOW")])).toBe("HIGH");
  });

  it("HIGH 1個のみ（MEDIUM 0個）でMEDIUMを返す", () => {
    expect(overallRisk([dim("HIGH"), dim("LOW"), dim("LOW")])).toBe("MEDIUM");
  });

  it("MEDIUM 3個以上でMEDIUMを返す", () => {
    expect(overallRisk([dim("MEDIUM"), dim("MEDIUM"), dim("MEDIUM")])).toBe("MEDIUM");
  });

  it("MEDIUM 1個でMEDIUMを返す", () => {
    expect(overallRisk([dim("MEDIUM"), dim("LOW"), dim("LOW")])).toBe("MEDIUM");
  });

  it("全LOWでLOWを返す", () => {
    expect(overallRisk([dim("LOW"), dim("LOW"), dim("LOW")])).toBe("LOW");
  });
});

describe("riskLabel", () => {
  it("HIGHでHIGH RISKを返す", () => {
    expect(riskLabel("HIGH")).toBe("HIGH RISK");
  });

  it("MEDIUMでMEDIUM RISKを返す", () => {
    expect(riskLabel("MEDIUM")).toBe("MEDIUM RISK");
  });

  it("LOWでLOW RISKを返す", () => {
    expect(riskLabel("LOW")).toBe("LOW RISK");
  });
});

describe("classifyConflictFrequency", () => {
  it("totalMerges=0でLOWを返す", () => {
    const result = classifyConflictFrequency(5, 0);
    expect(result.level).toBe("LOW");
    expect(result.detail).toBe("no merge appearances");
  });

  it("mergeAppearances=0でLOWを返す", () => {
    const result = classifyConflictFrequency(0, 10);
    expect(result.level).toBe("LOW");
    expect(result.detail).toBe("no merge appearances");
  });

  it("percentage>=20でHIGHを返す", () => {
    const result = classifyConflictFrequency(4, 20);
    expect(result.level).toBe("HIGH");
    expect(result.detail).toContain("20%");
  });

  it("percentage>=10かつ<20でMEDIUMを返す", () => {
    const result = classifyConflictFrequency(2, 20);
    expect(result.level).toBe("MEDIUM");
    expect(result.detail).toContain("10%");
  });

  it("percentage<10でLOWを返す", () => {
    const result = classifyConflictFrequency(1, 20);
    expect(result.level).toBe("LOW");
    expect(result.detail).toContain("5%");
  });
});

describe("classifyIntegrationStyle", () => {
  it("mergeRatio=0でlinearを返す", () => {
    expect(classifyIntegrationStyle(0, 10)).toBe("linear (no merges)");
  });

  it("高頻度かつ高ratio(>=5/week, >=0.2)でcontinuous integrationを返す", () => {
    expect(classifyIntegrationStyle(0.3, 6)).toBe("continuous integration");
  });

  it("mergesPerWeek>=1でregular mergingを返す", () => {
    expect(classifyIntegrationStyle(0.1, 2)).toBe("regular merging");
  });

  it("低頻度でbatch mergingを返す", () => {
    expect(classifyIntegrationStyle(0.1, 0.5)).toBe("batch merging");
  });
});
