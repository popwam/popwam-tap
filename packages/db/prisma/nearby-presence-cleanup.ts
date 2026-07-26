import { prisma } from "../src";

const execute = process.argv.includes("--execute");
const now = new Date();
const hardDeleteBefore = new Date(now.getTime() - 24 * 60 * 60_000);
const bucketDeleteBefore = new Date(now.getTime() - 48 * 60 * 60_000);

async function main() {
  const [expiredPresenceCount, staleBucketCount] = await Promise.all([
    prisma.nearbyPresence.count({ where: { expiresAt: { lt: hardDeleteBefore } } }),
    prisma.nearbyRateLimitBucket.count({ where: { windowStart: { lt: bucketDeleteBefore } } }),
  ]);

  console.log(JSON.stringify({
    mode: execute ? "EXECUTE" : "DRY_RUN",
    expiredPresenceCount,
    staleRateLimitBucketCount: staleBucketCount,
  }, null, 2));

  if (!execute) return;
  await prisma.$transaction([
    prisma.nearbyPresence.deleteMany({ where: { expiresAt: { lt: hardDeleteBefore } } }),
    prisma.nearbyRateLimitBucket.deleteMany({ where: { windowStart: { lt: bucketDeleteBefore } } }),
  ]);
}

main().finally(() => prisma.$disconnect());
