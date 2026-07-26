import type { DefaultSession } from "next-auth";
import type { SessionAuthMethod, SystemRole } from "@popwam/db";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: SystemRole } & DefaultSession["user"];
    webSessionId?: string;
    authMethod?: SessionAuthMethod;
  }
  interface User { role: SystemRole; authMethod?: SessionAuthMethod }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: SystemRole;
    webSessionId?: string;
    authMethod?: SessionAuthMethod;
    webSessionRevoked?: boolean;
  }
}
