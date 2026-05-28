import { describe, expect, it } from "vitest";
import { sortItemsByValue } from "../../src/popup/charts";

describe("sortItemsByValue", () => {
  it("orders keyword chart items by count and label", () => {
    const sorted = sortItemsByValue([
      { label: "MAXWIN", value: 2 },
      { label: "GACOR", value: 5 },
      { label: "SLOT", value: 5 }
    ]);

    expect(sorted[0]).toEqual({ label: "GACOR", value: 5 });
    expect(sorted[1]).toEqual({ label: "SLOT", value: 5 });
    expect(sorted[2]).toEqual({ label: "MAXWIN", value: 2 });
  });
});
