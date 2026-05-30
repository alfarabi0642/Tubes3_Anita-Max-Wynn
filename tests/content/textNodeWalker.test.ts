import { describe, expect, it } from "vitest";
import { isSkippedTagName } from "../../src/content/textNodeWalker";

describe("isSkippedTagName", () => {
  it("skips script, style, input, and textarea content", () => {
    expect(isSkippedTagName("script")).toBe(true);
    expect(isSkippedTagName("STYLE")).toBe(true);
    expect(isSkippedTagName("input")).toBe(true);
    expect(isSkippedTagName("textarea")).toBe(true);
  });

  it("allows regular visible text containers", () => {
    expect(isSkippedTagName("p")).toBe(false);
    expect(isSkippedTagName("div")).toBe(false);
  });
});
