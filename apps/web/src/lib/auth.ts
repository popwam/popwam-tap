import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@popwam/db";
import bcrypt from "bcryptjs";
import { ensureUserDefaults } from "./ensure-user";
import { hashActivationToken } from "./card-tokens";
import { verifyStoredAdminPassword } from "./admin-access";
import { headers } from "next/headers";
import { createWebSessionAuthority, revokeWebSessionAuthority, validateWebSessionAuthority } from "./security-session";

const WEB_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    id: "phone-otp",
    name: "Phone OTP",
    credentials: { ticket: { label: "One-time ticket", type: "text" } },
    async authorize(credentials) {
      const ticket=credentials?.ticket;if(!ticket||ticket.length<32)return null;
      const user=await prisma.$transaction(async tx=>{const record=await tx.authTicket.findUnique({where:{tokenHash:hashActivationToken(ticket)},include:{user:true}});if(!record||record.consumedAt||record.expiresAt<=new Date()||record.user.status!=="ACTIVE")return null;await tx.authTicket.update({where:{id:record.id},data:{consumedAt:new Date()}});await tx.user.update({where:{id:record.user.id},data:{lastLoginAt:new Date()}});return {...record.user,authMethod:record.authMethod};});
      if(!user)return null;return{id:user.id,email:user.email,name:user.name,image:user.image,role:user.role};
    },
  }),
  CredentialsProvider({
    id: "credentials",
    name: "Email and password",
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase();
      if (!email || !credentials?.password) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await verifyStoredAdminPassword(user, credentials.password, bcrypt.compare))) return null;
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await ensureUserDefaults(user.id);
      return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role, authMethod: "PASSWORD" };
    },
  }),
];

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: WEB_SESSION_MAX_AGE_SECONDS },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers,
  events: {
    async createUser({ user }) { await ensureUserDefaults(user.id); },
    async signIn({ user }) { if (user.id) await ensureUserDefaults(user.id); },
    async signOut(message) {
      const webSessionId = "token" in message ? message.token?.webSessionId : undefined;
      const userId = "token" in message ? String(message.token?.id || message.token?.sub || "") : "";
      if (webSessionId && userId) await revokeWebSessionAuthority(webSessionId, userId).catch(() => undefined);
    },
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.id) return false;
      const dbAccount = await prisma.user.findUnique({ where: { id: user.id }, select: { status: true } });
      if (dbAccount?.status !== "ACTIVE") return false;
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, role: true, name: true, email: true } });
        if (dbUser) {
          const requestHeaders = await headers();
          const authority = await prisma.$transaction(tx => createWebSessionAuthority(tx, {
            userId: dbUser.id,
            authMethod: user.authMethod || "LEGACY",
            userAgent: requestHeaders.get("user-agent"),
            maxAgeSeconds: WEB_SESSION_MAX_AGE_SECONDS,
          }));
          token.id = dbUser.id; token.role = dbUser.role; token.name = dbUser.name; token.email = dbUser.email;
          token.webSessionId = authority.session.id; token.authMethod = authority.session.authMethod; token.webSessionRevoked = false;
        }
      } else if (token.sub && token.webSessionId) {
        const authority = await validateWebSessionAuthority(token.webSessionId, String(token.id || token.sub));
        if (!authority) {
          token.webSessionRevoked = true;
          token.id = undefined;
        } else {
          token.authMethod = authority.authMethod;
          token.webSessionRevoked = false;
        }
      } else if (token.sub && !token.webSessionId) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.sub }, select: { id: true, role: true, sessionsRevokedBefore: true } });
        const issuedAt = typeof token.iat === "number" ? new Date(token.iat * 1000) : null;
        if (dbUser?.sessionsRevokedBefore && (!issuedAt || issuedAt <= dbUser.sessionsRevokedBefore)) {
          token.webSessionRevoked = true;
          token.id = undefined;
        } else if (dbUser) {
          const requestHeaders = await headers();
          const authority = await prisma.$transaction(tx => createWebSessionAuthority(tx, {
            userId: dbUser.id,
            authMethod: "LEGACY",
            userAgent: requestHeaders.get("user-agent"),
            maxAgeSeconds: WEB_SESSION_MAX_AGE_SECONDS,
          }));
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.webSessionId = authority.session.id;
          token.authMethod = "LEGACY";
          token.webSessionRevoked = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.webSessionRevoked ? "" : String(token.id || token.sub || "");
        session.user.role = token.role || "USER";
      }
      session.webSessionId = token.webSessionRevoked ? undefined : token.webSessionId;
      session.authMethod = token.authMethod;
      return session;
    },
  },
};
