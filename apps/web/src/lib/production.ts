import { getPermanentCardUrl } from "@popwam/shared";
import { createActivationCode, createOpaqueToken, hashActivationToken } from "./card-tokens";

export function cardTypeForInventoryItem(type: string) {
  if (type === "BLANK_STICKER") return "NFC_STICKER" as const;
  if (type === "BLANK_WRISTBAND") return "WRISTBAND" as const;
  if (type === "QR_PRODUCT") return "QR_ONLY" as const;
  return "NFC_CARD" as const;
}

export function serialPrefixForProduct(sku: string) {
  const normalized = sku.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return normalized || "PW";
}

export function createProductionRows(input: {
  quantity: number;
  startingSerialNumber: number;
  serialPrefix: string;
  publicSlugPrefix: string;
}) {
  const width = Math.max(6, String(input.startingSerialNumber + input.quantity - 1).length);
  return Array.from({ length: input.quantity }, (_, index) => {
    const sequence = input.startingSerialNumber + index;
    const suffix = String(sequence).padStart(width, "0");
    const activationCode = createActivationCode();
    const publicSlug = `${input.publicSlugPrefix}${suffix}`;
    return {
      serialNumber: `${input.serialPrefix}${suffix}`,
      publicSlug,
      immutableToken: createOpaqueToken(24),
      permanentUrl: getPermanentCardUrl(publicSlug),
      activationCode,
      activationTokenHash: hashActivationToken(activationCode),
    };
  });
}

export function activationCodeCanBeConsumed(input: {
  ownerId: string | null;
  assignmentStatus: string;
  consumedAt: Date | null;
}) {
  return !input.ownerId && input.assignmentStatus === "UNASSIGNED" && !input.consumedAt;
}
