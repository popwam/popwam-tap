import type {AuthenticationResponseJSON} from "@simplewebauthn/server";
import {prisma} from "@popwam/db";
import {createOpaqueToken,hashActivationToken} from "@/lib/card-tokens";
import {csrfRejected,isSameOriginMutation} from "@/lib/api-auth";
import {consumeVerifiedPasskeyAssertion,verifyPasskeyAssertion} from "@/lib/passkey-authentication";

export async function POST(request:Request){if(!isSameOriginMutation(request))return csrfRejected();const body=await request.json().catch(()=>null) as AuthenticationResponseJSON|null;const proof=await verifyPasskeyAssertion(body,"WEB");if(!proof)return Response.json({ok:false,error:"PASSKEY_INVALID"},{status:400});try{const ticket=createOpaqueToken();await prisma.$transaction(async tx=>{await consumeVerifiedPasskeyAssertion(tx,proof);await tx.authTicket.create({data:{tokenHash:hashActivationToken(ticket),userId:proof.userId,authMethod:"PASSKEY",expiresAt:new Date(Date.now()+2*60_000)}})});return Response.json({ok:true,ticket})}catch{return Response.json({ok:false,error:"PASSKEY_INVALID"},{status:400})}}
