import { Prisma } from "@popwam/db";

const DOMAIN_ERROR = /^[A-Z][A-Z0-9_]*$/;

/** Converts unexpected runtime/ORM exceptions into a stable public error while
 * retaining a safe DEBUG diagnostic. No request data or identifiers are logged. */
export function profileRuntimeFailure(operation: "CREATE" | "VISIBILITY" | "PUBLISH", error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  const errorClass = error instanceof Error ? error.constructor.name : typeof error;
  const prismaCode = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
  const prismaClass = error instanceof Prisma.PrismaClientKnownRequestError
    ? "PrismaClientKnownRequestError"
    : error instanceof Prisma.PrismaClientUnknownRequestError
      ? "PrismaClientUnknownRequestError"
      : error instanceof Prisma.PrismaClientInitializationError
        ? "PrismaClientInitializationError"
        : undefined;
  const code = DOMAIN_ERROR.test(message) ? message : fallback;
  const category = message.includes("Transaction API error") || message.includes("Transaction already closed")
    ? "TRANSACTION_CLOSED"
    : message.includes("Timed out") || message.includes("timeout")
      ? "TIMEOUT"
      : "UNEXPECTED";
  if (process.env.NODE_ENV !== "test") {
    console.error(`PROFILE_${operation}_FAILURE`, { code, errorClass, prismaClass, prismaCode, category });
  }
  return { code, errorClass, prismaClass, prismaCode, category };
}
