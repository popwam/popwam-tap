import { describe, expect, it } from "vitest";
import { nativeNfcInstructions, webNfcWritingAvailable } from "./nfc-capabilities";

describe("platform-specific NFC", () => {
  it("never claims Web NFC writing on iPhone", () => {
    expect(webNfcWritingAvailable({ isIOS: true, hasNdefReader: true })).toBe(false);
    expect(nativeNfcInstructions(true)).toContain("Core NFC");
  });

  it("offers Web NFC only as an Android-browser helper", () => expect(webNfcWritingAvailable({ isIOS: false, hasNdefReader: true })).toBe(true));
});
