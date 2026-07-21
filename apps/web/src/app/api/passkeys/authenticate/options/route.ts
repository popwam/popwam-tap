import {generateAuthenticationOptions} from "@simplewebauthn/server";
import {prisma} from "@popwam/db";
import {passkeyChallengeHash,passkeyConfig} from "@/lib/passkeys";
import {csrfRejected,isSameOriginMutation} from "@/lib/api-auth";

export async function POST(request:Request){if(!isSameOriginMutation(request))return csrfRejected();const {rpID}=passkeyConfig();const options=await generateAuthenticationOptions({rpID,userVerification:"required",allowCredentials:[]});await prisma.passkeyChallenge.create({data:{type:"AUTHENTICATE",challengeHash:passkeyChallengeHash(options.challenge),expiresAt:new Date(Date.now()+5*60_000)}});return Response.json(options,{headers:{"cache-control":"no-store"}})}
