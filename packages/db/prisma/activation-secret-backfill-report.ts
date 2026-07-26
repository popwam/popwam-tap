import { prisma } from "../src";

type Classification =
  | "LEGACY_ACTIVATION"
  | "SCRATCH_READY"
  | "ALREADY_ACTIVATED"
  | "NEEDS_REISSUE_OR_OPERATOR_ACTION";

async function main() {
  const cards = await prisma.card.findMany({
    select: {
      ownerId: true,
      assignmentStatus: true,
      cardStatus: true,
      activatedAt: true,
      activationTokenConsumedAt: true,
      activationSecretHash: true,
      activationSecretState: true,
      activationSecretConsumedAt: true,
      producedTag: {
        select: {
          status: true,
          activationCode: true,
          activationSecretVersion: true,
          scratchSecretExportCiphertext: true,
          scratchSecretExportedAt: true,
        },
      },
    },
  });

  const classify = (card: typeof cards[number]): Classification => {
    if (
      card.ownerId ||
      card.activatedAt ||
      card.activationTokenConsumedAt ||
      card.activationSecretConsumedAt ||
      card.activationSecretState === "CONSUMED" ||
      card.assignmentStatus !== "UNASSIGNED"
    ) return "ALREADY_ACTIVATED";

    if (
      card.activationSecretState === "SCRATCH_READY" &&
      card.activationSecretHash &&
      card.producedTag?.activationSecretVersion
    ) return "SCRATCH_READY";

    if (
      card.activationSecretState === "LEGACY" &&
      card.producedTag?.activationCode &&
      !card.producedTag.activationCode.startsWith("legacy-disabled:")
    ) return "LEGACY_ACTIVATION";

    return "NEEDS_REISSUE_OR_OPERATOR_ACTION";
  };

  const counts = cards.reduce<Record<Classification, number>>((all, card) => {
    all[classify(card)] += 1;
    return all;
  }, {
    LEGACY_ACTIVATION: 0,
    SCRATCH_READY: 0,
    ALREADY_ACTIVATED: 0,
    NEEDS_REISSUE_OR_OPERATOR_ACTION: 0,
  });

  // Aggregate only: no identifier, code, hash, ciphertext, owner, or inventory detail.
  console.log(JSON.stringify({
    mode: "READ_ONLY_DRY_RUN",
    mutationPerformed: false,
    totalProducts: cards.length,
    counts,
    note: "Run only in an explicitly approved environment after the Phase G additive schema exists.",
  }, null, 2));
}

main()
  .catch((error) => {
    console.error("Activation-secret classification failed without mutation.", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
