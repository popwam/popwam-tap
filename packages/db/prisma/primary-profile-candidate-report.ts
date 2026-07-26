import { prisma } from "../src";
import { selectPrimaryProfileCandidate } from "../../../apps/web/src/lib/profile-backfill";

/** Read-only candidate report. Ambiguous users are intentionally not changed. */
async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      defaultSharingCardId: true,
      profiles: { select: { id: true, isPrimary: true, createdAt: true, virtualCard: { select: { id: true, isDefault: true } } } },
    },
    orderBy: { id: "asc" },
  });
  const candidates = users.map((user) => selectPrimaryProfileCandidate({
    userId: user.id,
    defaultSharingCardId: user.defaultSharingCardId,
    profiles: user.profiles.map((profile) => ({
      id: profile.id,
      isPrimary: profile.isPrimary,
      createdAt: profile.createdAt,
      virtualCardIds: profile.virtualCard ? [profile.virtualCard.id] : [],
      defaultVirtualCard: Boolean(profile.virtualCard?.isDefault),
    })),
  }));
  const totals = candidates.reduce((result, candidate) => ({ ...result, [candidate.status]: result[candidate.status] + 1 }), { CANDIDATE: 0, AMBIGUOUS: 0, MISSING: 0 });
  console.log(JSON.stringify({ mode: "DRY_RUN", writesImplemented: false, totals, users: candidates }, null, 2));
}

main().catch((error) => { console.error("PHASE_B_PRIMARY_CANDIDATE_DRY_RUN_FAILED", error instanceof Error ? error.name : "unknown"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
