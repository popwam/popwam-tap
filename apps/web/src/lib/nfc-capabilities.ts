export function webNfcWritingAvailable(input: { isIOS: boolean; hasNdefReader: boolean }) {
  return !input.isIOS && input.hasNdefReader;
}

export function nativeNfcInstructions(isIOS: boolean) {
  return isIOS ? "Use the POPWAM Tap iOS app with Core NFC." : "Install or open the POPWAM Tap Android app.";
}
