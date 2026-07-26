import { prisma } from "../src";

type Classification = "LEGACY_PUBLIC" | "LEGACY_PRIVATE" | "NEW_DRAFT" | "ALREADY_CANONICAL" | "AMBIGUOUS";

async function main() {
  const profiles = await prisma.profile.findMany({
    select: { id: true, profileKind: true, lifecycle: true, isPublic: true, publication: { select: { id: true } } },
    orderBy: { createdAt: "asc" },
  });
  const rows = profiles.map((profile): { profileId: string; classification: Classification } => {
    if (profile.publication) return { profileId: profile.id, classification: "ALREADY_CANONICAL" };
    if (profile.profileKind && profile.lifecycle === "DRAFT") return { profileId: profile.id, classification: "NEW_DRAFT" };
    if (!profile.profileKind && profile.isPublic) return { profileId: profile.id, classification: "LEGACY_PUBLIC" };
    if (!profile.profileKind && !profile.isPublic) return { profileId: profile.id, classification: "LEGACY_PRIVATE" };
    return { profileId: profile.id, classification: "AMBIGUOUS" };
  });
  console.log(JSON.stringify({
    mode: "READ_ONLY",
    counts: rows.reduce<Record<string, number>>((all, row) => ({ ...all, [row.classification]: (all[row.classification] || 0) + 1 }), {}),
    rows,
  }, null, 2));
}

main().finally(() => prisma.$disconnect());
