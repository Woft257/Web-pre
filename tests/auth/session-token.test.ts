import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  env: { SESSION_SECRET: "test-session-secret-with-at-least-32-bytes" },
}));

import { signSessionToken, verifySessionToken } from "@/lib/auth/session-token";

describe("JWT user sessions", () => {
  it("signs and verifies the user and auth version", async () => {
    const token = await signSessionToken("af5fce11-0344-44c2-87c7-5da9b78841ea", 3);

    expect(token.split(".")).toHaveLength(3);
    await expect(verifySessionToken(token)).resolves.toEqual({
      userId: "af5fce11-0344-44c2-87c7-5da9b78841ea",
      authVersion: 3,
    });
  });

  it("rejects a modified token", async () => {
    const token = await signSessionToken("af5fce11-0344-44c2-87c7-5da9b78841ea", 1);
    const lastCharacter = token.at(-1) === "a" ? "b" : "a";

    await expect(verifySessionToken(`${token.slice(0, -1)}${lastCharacter}`)).resolves.toBeNull();
  });
});
