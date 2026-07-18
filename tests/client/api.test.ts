import { describe, expect, it } from "vitest";

import { formatEventDeadline } from "@/lib/client/api";

describe("event deadline formatting", () => {
  it("shows the fixed GMT+7 event deadline with date and year", () => {
    expect(formatEventDeadline("2026-07-19T16:59:00.000Z")).toBe("23:59 19/07/2026 GMT+7");
  });
});
