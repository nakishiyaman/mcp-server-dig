import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseTagOutput } from "../../git/parsers.js";
import { getRepoDir } from "./helpers.js";

describe("git_tag_list (end-to-end)", () => {
  it("lists tags sorted by newest first", async () => {
    const output = await execGit(
      [
        "tag",
        "-l",
        "--sort=-creatordate",
        "--format=%(refname:short)|%(creatordate:iso-strict)|%(subject)",
      ],
      getRepoDir(),
    );
    const tags = parseTagOutput(output);

    expect(tags).toHaveLength(2);
    const tagNames = tags.map((t) => t.name);
    expect(tagNames).toContain("v0.1.0");
    expect(tagNames).toContain("v0.2.0");
  });

  it("filters tags by pattern", async () => {
    const output = await execGit(
      [
        "tag",
        "-l",
        "--sort=-creatordate",
        "--format=%(refname:short)|%(creatordate:iso-strict)|%(subject)",
        "v0.1*",
      ],
      getRepoDir(),
    );
    const tags = parseTagOutput(output);

    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe("v0.1.0");
    expect(tags[0].subject).toBe("Initial release");
  });
});
