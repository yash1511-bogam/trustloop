import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/stytch", () => ({
  isSamlSsoSupported: vi.fn(() => false),
  authenticateSamlToken: vi.fn(async () => { throw new Error("SAML not configured"); }),
}));

describe("SAML SSO support", () => {
  it("returns false when SAML is not configured", async () => {
    const { isSamlSsoSupported } = await import("@/lib/stytch");
    expect(isSamlSsoSupported()).toBe(false);
  });

  it("authenticateSamlToken throws when not configured", async () => {
    const { authenticateSamlToken } = await import("@/lib/stytch");
    await expect(authenticateSamlToken("bad-token")).rejects.toThrow("SAML not configured");
  });
});
