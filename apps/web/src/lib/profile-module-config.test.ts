import { describe, expect, it } from "vitest";
import { validateProfileModuleConfiguration } from "./profile-module-config";

describe("ProfileModule configuration validation", () => {
  it("accepts bounded, definition-owned presentation configuration", () => {
    expect(validateProfileModuleConfiguration("GALLERY", { layout: "grid", columns: 3 })).toEqual({ valid: true, value: { layout: "grid", columns: 3 } });
  });

  it("rejects unknown keys, URLs, nested data, and executable payloads", () => {
    expect(validateProfileModuleConfiguration("CONTACT", { phone: "+201234" })).toEqual({ valid: false, error: "MODULE_CONFIGURATION_UNKNOWN_KEY" });
    expect(validateProfileModuleConfiguration("IDENTITY", { layout: "https://example.test" })).toEqual({ valid: false, error: "MODULE_CONFIGURATION_INVALID_VALUE" });
    expect(validateProfileModuleConfiguration("GALLERY", { layout: { html: "<script>bad</script>" } })).toEqual({ valid: false, error: "MODULE_CONFIGURATION_INVALID_VALUE" });
    expect(validateProfileModuleConfiguration("SOCIAL", { script: "alert(1)" })).toEqual({ valid: false, error: "MODULE_CONFIGURATION_UNKNOWN_KEY" });
  });
});
