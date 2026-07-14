import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/index";

function enabled(name: string) { return process.env[name]?.trim().toLowerCase() === "true"; }

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
  const railwayProduction = process.env.RAILWAY_ENVIRONMENT_NAME?.toLowerCase().includes("production") === true;
  if ((process.env.NODE_ENV === "production" || railwayProduction) && !enabled("ADMIN_ENSURE_PRODUCTION")) {
    throw new Error("Refusing production execution. Set ADMIN_ENSURE_PRODUCTION=true only for an intentional manual run.");
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, passwordHash: true } });
  if (existing && existing.role !== "ADMIN" && existing.role !== "SUPER_ADMIN") throw new Error("The configured email belongs to a non-admin user; no changes were made.");

  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { email, name: "POPWAM Admin", role: "ADMIN", status: "ACTIVE", passwordHash } });
    console.log("Admin account created.");
    return;
  }

  if (enabled("ADMIN_FORCE_PASSWORD_RESET")) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash } });
    console.log("Admin password hash updated.");
    return;
  }

  if (!existing.passwordHash) console.log("Admin exists without a password hash. Re-run with ADMIN_FORCE_PASSWORD_RESET=true to repair it.");
  else console.log("Admin account already exists; no changes made.");
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Admin ensure failed."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
