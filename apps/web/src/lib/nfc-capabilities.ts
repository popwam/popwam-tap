export function webNfcWritingAvailable(input: { isIOS: boolean; hasNdefReader: boolean }) {
  return !input.isIOS && input.hasNdefReader;
}

export function nativeNfcInstructions(isIOS: boolean) {
  return isIOS ? "Use the POP by POPWAM iOS app with Core NFC." : "Install or open the POP by POPWAM Android app.";
}
