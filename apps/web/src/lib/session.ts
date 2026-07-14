import { getServerSession } from "next-auth";
import { forbidden, redirect } from "next/navigation";
import { authOptions } from "./auth";
import { prisma } from "@popwam/db";
import { isAdminRole } from "./admin-access";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, image: true, role: true, status: true } });
  if (!user || user.status !== "ACTIVE") redirect("/login?error=AccountUnavailable");
  return user;
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/admin/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, image: true, role: true, status: true } });
  if (!user || user.status !== "ACTIVE" || !isAdminRole(user.role)) forbidden();
  return user;
}
