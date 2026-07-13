import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@popwam/db";
import bcrypt from "bcryptjs";
import { ensureUserDefaults } from "./ensure-user";
import { hashActivationToken } from "./card-tokens";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    id: "phone-otp",
    name: "Phone OTP",
    credentials: { ticket: { label: "One-time ticket", type: "text" } },
    async authorize(credentials) {
      const ticket=credentials?.ticket;if(!ticket||ticket.length<32)return null;
      const user=await prisma.$transaction(async tx=>{const record=await tx.authTicket.findUnique({where:{tokenHash:hashActivationToken(ticket)},include:{user:true}});if(!record||record.consumedAt||record.expiresAt<=new Date()||record.user.status!=="ACTIVE")return null;await tx.authTicket.update({where:{id:record.id},data:{consumedAt:new Date()}});await tx.user.update({where:{id:record.user.id},data:{lastLoginAt:new Date()}});return record.user;});
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
      if (!user?.passwordHash || user.status !== "ACTIVE" || !(await bcrypt.compare(credentials.password, user.passwordHash))) return null;
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await ensureUserDefaults(user.id);
      return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    allowDangerousEmailAccountLinking: false,
  }));
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers,
  events: {
    async createUser({ user }) { await ensureUserDefaults(user.id); },
    async signIn({ user }) { if (user.id) await ensureUserDefaults(user.id); },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if(account?.provider==="google"&&profile&&"email_verified" in profile&&profile.email_verified!==true)return false;
      if (!user.id) return false;
      const dbAccount = await prisma.user.findUnique({ where: { id: user.id }, select: { status: true } });
      if (dbAccount?.status !== "ACTIVE") return false;
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, role: true, name: true, email: true } });
        if (dbUser) { token.id = dbUser.id; token.role = dbUser.role; token.name = dbUser.name; token.email = dbUser.email; }
      } else if (token.sub && (!token.id || !token.role)) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.sub }, select: { id: true, role: true } });
        if (dbUser) { token.id = dbUser.id; token.role = dbUser.role; }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id || token.sub || "");
        session.user.role = token.role || "USER";
      }
      return session;
    },
  },
};
