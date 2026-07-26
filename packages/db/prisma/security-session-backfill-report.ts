import { prisma } from "../src";

async function main() {
  const [webSessions, mobileRows, devices, pushTokens] = await Promise.all([
    prisma.session.findMany({ select: { userId: true, deviceSessionId: true } }),
    prisma.mobileRefreshToken.findMany({ select: { userId: true, familyId: true, deviceSessionId: true } }),
    prisma.deviceSession.findMany({
      select: {
        id: true,
        userId: true,
        _count: { select: { webSessions: true, mobileRefreshTokens: true } },
      },
    }),
    prisma.devicePushToken.findMany({
      select: { userId: true, deviceSessionId: true, deviceSession: { select: { userId: true } } },
    }),
  ]);

  const mobileFamilies = new Map<string, typeof mobileRows>();
  for (const row of mobileRows) {
    const key = `${row.userId}:${row.familyId}`;
    mobileFamilies.set(key, [...(mobileFamilies.get(key) || []), row]);
  }

  const counts = {
    LINKED: webSessions.filter(row => row.deviceSessionId).length +
      [...mobileFamilies.values()].filter(rows => rows.some(row => row.deviceSessionId)).length,
    LEGACY_WEB: webSessions.filter(row => !row.deviceSessionId).length,
    LEGACY_MOBILE: [...mobileFamilies.values()].filter(rows => rows.every(row => !row.deviceSessionId)).length,
    ORPHAN_DEVICE: devices.filter(row => row._count.webSessions === 0 && row._count.mobileRefreshTokens === 0).length,
    ORPHAN_PUSH_TOKEN: pushTokens.filter(row => !row.deviceSessionId || !row.deviceSession).length,
    AMBIGUOUS: pushTokens.filter(row => row.deviceSession && row.deviceSession.userId !== row.userId).length +
      [...mobileFamilies.values()].filter(rows => new Set(rows.map(row => row.deviceSessionId).filter(Boolean)).size > 1).length,
  };

  console.log(JSON.stringify({
    mode: "READ_ONLY_DRY_RUN",
    mutationPerformed: false,
    counts,
    note: "Aggregate classification only. No session token, refresh hash, family identifier, push token, or user content is output.",
  }, null, 2));
}

main()
  .catch(error => {
    console.error("Security-session classification failed without mutation.", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
