import { describe, expect, it } from "vitest";

import { formatProbability } from "@/lib/client/api";
import {
  changePasswordSchema,
  quoteRequestSchema,
  registrationRequestSchema,
  sessionRequestSchema,
} from "@/lib/validation/schemas";

describe("trade request limits", () => {
  it("keeps the 10 point minimum without an application maximum", () => {
    expect(() => quoteRequestSchema.parse({ action: "buy", side: "home", amount: 9.99 }))
      .toThrow();
    expect(quoteRequestSchema.parse({ action: "buy", side: "home", amount: 10_000 }))
      .toMatchObject({ amount: 10_000 });
  });

  it("shows Kalshi probabilities with two decimal places", () => {
    expect(formatProbability(0.635)).toBe("63.50%");
    expect(formatProbability(0.4135)).toBe("41.35%");
    expect(formatProbability(0.635363)).toBe("63.54%");
  });

  it("requires a password with every UID login", () => {
    expect(() => sessionRequestSchema.parse({ uid: "12345678" })).toThrow();
    expect(sessionRequestSchema.parse({
      uid: "12345678",
      password: "password-2026",
    })).toMatchObject({ uid: "12345678" });
  });

  it("validates self-registration credentials", () => {
    expect(() => registrationRequestSchema.parse({ uid: "123", password: "password-2026" }))
      .toThrow();
    expect(registrationRequestSchema.parse({
      uid: "12345678",
      password: "password-2026",
    })).toMatchObject({ uid: "12345678" });
  });

  it("requires a different valid password for account password changes", () => {
    expect(() => changePasswordSchema.parse({
      currentPassword: "password-2026",
      newPassword: "password-2026",
    })).toThrow();
    expect(changePasswordSchema.parse({
      currentPassword: "password-2026",
      newPassword: "new-password-2026",
    })).toMatchObject({ newPassword: "new-password-2026" });
  });
});
