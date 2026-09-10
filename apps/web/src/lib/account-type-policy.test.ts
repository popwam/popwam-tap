import { describe, expect, it } from "vitest";
import {
  defaultAccountTypePolicies,
  sanitizeAccountTypePolicies,
} from "./account-type-policy";

describe("account type policy", () => {
  it("uses only real supplied module keys and keeps identity required", () =>
    expect(
      Object.keys(
        defaultAccountTypePolicies(["IDENTITY", "SERVICES"]).PERSONAL.modules,
      ),
    ).toEqual(["IDENTITY", "SERVICES"]));
  it("rejects unknown states by reverting to the safe default", () =>
    expect(
      sanitizeAccountTypePolicies(
        { BUSINESS: { modules: { IDENTITY: "BROKEN", SERVICES: "REQUIRED" } } },
        ["IDENTITY", "SERVICES"],
      ).BUSINESS.modules,
    ).toEqual({ IDENTITY: "REQUIRED", SERVICES: "REQUIRED" }));
});
