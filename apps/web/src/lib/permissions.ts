import { prisma } from "@popwam/db";
import { isAdminRole } from "./admin-access";

export function ownerWhere(user: { id: string; role: string }) {
  return isAdminRole(user.role) ? {} : { ownerId: user.id };
}

export async function canManageTag(user: { id: string; role: string }, tagId: string) {
  return prisma.tag.findFirst({ where: { id: tagId, ...(isAdminRole(user.role) ? {} : { ownerId: user.id }) }, select: { id: true } });
}

export async function canManageDestination(user: { id: string; role: string }, destinationId: string) {
  return prisma.destination.findFirst({ where: { id: destinationId, ...(isAdminRole(user.role) ? {} : { userId: user.id }) }, select: { id: true } });
}
