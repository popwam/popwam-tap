import { prisma } from "@popwam/db";

export function ownerWhere(user: { id: string; role: string }) {
  return user.role === "ADMIN" ? {} : { ownerId: user.id };
}

export async function canManageTag(user: { id: string; role: string }, tagId: string) {
  return prisma.tag.findFirst({ where: { id: tagId, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) }, select: { id: true } });
}

export async function canManageDestination(user: { id: string; role: string }, destinationId: string) {
  return prisma.destination.findFirst({ where: { id: destinationId, ...(user.role === "ADMIN" ? {} : { userId: user.id }) }, select: { id: true } });
}
