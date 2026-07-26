import { createHash } from "node:crypto";
import { prisma } from "../src";

function pairKey(first: string, second: string) {
  return first < second ? `${first}:${second}` : `${second}:${first}`;
}

function safePairReference(value: string) {
  return createHash("sha256").update(`pop-friends-audit:${value}`).digest("hex").slice(0, 16);
}

async function main() {
  const [friendships, blocks] = await Promise.all([
    prisma.friendship.findMany({
      select: {
        userAId: true,
        userBId: true,
        requestedById: true,
        blockedById: true,
        status: true,
      },
    }),
    prisma.userBlock.findMany({ select: { ownerId: true, blockedId: true } }),
  ]);

  const durableBlocks = new Set(blocks.map(row => `${row.ownerId}:${row.blockedId}`));
  const directions = new Map<string, number>();
  for (const row of friendships) {
    const key = pairKey(row.userAId, row.userBId);
    directions.set(key, (directions.get(key) || 0) + 1);
  }

  const classifications = {
    VALID_MUTUAL: 0,
    ONE_SIDED_LEGACY: 0,
    DUPLICATE: 0,
    BLOCK_CONFLICT: 0,
    AMBIGUOUS: 0,
  };
  const ambiguousPairs: string[] = [];

  for (const row of friendships) {
    const key = pairKey(row.userAId, row.userBId);
    const participantIds = new Set([row.userAId, row.userBId]);
    const hasDurableBlock = durableBlocks.has(`${row.userAId}:${row.userBId}`) || durableBlocks.has(`${row.userBId}:${row.userAId}`);
    const duplicate = (directions.get(key) || 0) > 1;
    const structurallyAmbiguous =
      row.userAId === row.userBId ||
      !participantIds.has(row.requestedById) ||
      Boolean(row.blockedById && !participantIds.has(row.blockedById)) ||
      (row.status === "BLOCKED" && !row.blockedById);

    if (structurallyAmbiguous) {
      classifications.AMBIGUOUS += 1;
      if (ambiguousPairs.length < 20) ambiguousPairs.push(safePairReference(key));
    } else if (duplicate) {
      classifications.DUPLICATE += 1;
    } else if (hasDurableBlock && row.status !== "BLOCKED") {
      classifications.BLOCK_CONFLICT += 1;
    } else if (row.status === "ACCEPTED") {
      classifications.VALID_MUTUAL += 1;
    } else {
      classifications.ONE_SIDED_LEGACY += 1;
    }
  }

  console.log(JSON.stringify({
    mode: "READ_ONLY_DRY_RUN",
    mutationPerformed: false,
    totalLegacyFriendships: friendships.length,
    classifications,
    ambiguousPairReferences: ambiguousPairs,
    note: "Aggregate classification only. Pair references are one-way audit hashes; no names, phones, emails, report content, or raw user identifiers are output.",
  }, null, 2));
}

main()
  .catch(error => {
    console.error("Friends classification failed without mutation.", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
