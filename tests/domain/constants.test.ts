import { describe, expect, it } from "vitest";

import { floorToMicroUnits } from "@/lib/domain/constants";

describe("point precision", () => {
  it("never rounds a Max value above the available micro-unit balance", () => {
    expect(floorToMicroUnits(9_650.999_999_9)).toBe(9_650.999_999);
    expect(floorToMicroUnits(1.234_567_89)).toBe(1.234_567);
  });
});
