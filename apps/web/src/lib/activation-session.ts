import "server-only";
import {cookies} from "next/headers";
import {prisma} from "@popwam/db";
import {hashActivationToken} from "@/lib/card-tokens";

export const ACTIVATION_COOKIE="popwam_activation_claim";
export const OTP_COOKIE="popwam_otp_challenge";
export const secureCookie={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/"};

export async function getActivationClaim(){const token=(await cookies()).get(ACTIVATION_COOKIE)?.value;if(!token)return null;return prisma.activationClaimSession.findUnique({where:{sessionTokenHash:hashActivationToken(token)},include:{card:true}});}
