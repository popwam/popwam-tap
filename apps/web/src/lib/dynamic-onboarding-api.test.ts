import { describe, expect, it } from "vitest";
import { unexpectedKeys } from "./dynamic-onboarding-api";

describe("dynamic onboarding API boundary", () => {
  it("rejects client-supplied identity, definition, mapping, and profile targets", () => {
    expect(unexpectedKeys({ locale: "en", profileId: "other-user" }, ["locale"])).toBe(true);
    expect(unexpectedKeys({ revision: 1, mappingKey: "RAW_COLUMN" }, ["revision"])).toBe(true);
    expect(unexpectedKeys({ definitionId: "restaurant", answers: {} }, ["answers"])).toBe(true);
  });

  it("accepts only the declared request contract", () => {
    expect(unexpectedKeys({ locale: "ar", revision: 2 }, ["locale", "revision"])).toBe(false);
  });
});
