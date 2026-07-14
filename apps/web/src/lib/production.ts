import { getPermanentCardUrl } from "@popwam/shared";
import { createActivationCode, createOpaqueToken, hashActivationToken } from "./card-tokens";

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
