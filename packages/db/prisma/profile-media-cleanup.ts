import { prisma } from "../src";
import { deleteDraftObject, deleteObject } from "../../storage/src";

const execute = process.argv.includes("--execute");
const now = new Date();

async function main() {
  const candidates = await prisma.profileMediaAsset.findMany({
    where: {
      OR: [
        { state: "TEMPORARY", temporaryExpiresAt: { lt: now } },
        { state: "ORPHANED", orphanedAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60_000) } },
      ],
    },
    select: { id: true, storageKey: true, publicStorageKey: true, state: true, originalFilename: true },
  });
  const referenced = new Set((await prisma.profileRevisionMedia.findMany({
    where: { mediaId: { in: candidates.map((item) => item.id) }, revision: { currentFor: { isNot: null } } },
    select: { mediaId: true },
  })).map((item) => item.mediaId));
  const safe = candidates.filter((item) => !referenced.has(item.id));
  console.log(JSON.stringify({ mode: execute ? "EXECUTE" : "DRY_RUN", candidates: safe.map(({ id, state, originalFilename }) => ({ id, state, originalFilename })) }, null, 2));
  if (!execute) return;
  for (const item of safe) {
    await deleteDraftObject(item.storageKey);
    if (item.publicStorageKey) await deleteObject(item.publicStorageKey);
    await prisma.profileMediaAsset.update({ where: { id: item.id }, data: { state: "DELETED", deletedAt: now } });
  }
}

main().finally(() => prisma.$disconnect());
