import type { DefaultSession } from "next-auth";
import type { SystemRole } from "@popwam/db";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: SystemRole } & DefaultSession["user"];
  }
  interface User { role: SystemRole }
}

declare module "next-auth/jwt" {
  interface JWT { id?: string; role?: SystemRole }
}
