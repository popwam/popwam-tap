import "server-only";
import {generateAuthenticationOptions,verifyAuthenticationResponse,type AuthenticationResponseJSON} from "@simplewebauthn/server";
import {prisma,type PasskeyChallengeType,type Prisma} from "@popwam/db";
import {passkeyChallengeHash,passkeyConfig,passkeyExpectedOrigins,responseChallenge,type PasskeyAuthenticationChannel} from "./passkeys";

const challengeType=(channel:PasskeyAuthenticationChannel):PasskeyChallengeType=>channel==="WEB"?"AUTHENTICATE":"AUTHENTICATE_MOBILE";
export const passkeyChallengeTypeForChannel=challengeType;

export async function createPasskeyAuthenticationOptions(channel:PasskeyAuthenticationChannel){
  if(channel==="MOBILE")passkeyExpectedOrigins(channel);
  const {rpID}=passkeyConfig();
  const options=await generateAuthenticationOptions({rpID,userVerification:"required",allowCredentials:[]});
  await prisma.passkeyChallenge.create({data:{type:challengeType(channel),challengeHash:passkeyChallengeHash(options.challenge),expiresAt:new Date(Date.now()+5*60_000)}});
  return options;
}

export type VerifiedPasskeyAssertion={
  challengeId:string;
  challengeType:PasskeyChallengeType;
  credentialRowId:string;
  userId:string;
  expectedCounter:bigint;
  newCounter:bigint;
  credentialBackedUp:boolean;
};

type AssertionVerifier=typeof verifyAuthenticationResponse;
type StoredChallenge={id:string};
type StoredCredential={id:string;userId:string;credentialId:string;publicKey:Uint8Array|Buffer;counter:bigint;transports:string[];user:{status:string}};
export type PasskeyAssertionLookup={
  findChallenge:(type:PasskeyChallengeType,challengeHash:string,now:Date)=>Promise<StoredChallenge|null>;
  findCredential:(credentialId:string)=>Promise<StoredCredential|null>;
};
const productionLookup:PasskeyAssertionLookup={
  findChallenge:(type,challengeHash,now)=>prisma.passkeyChallenge.findFirst({where:{type,challengeHash,consumedAt:null,expiresAt:{gt:now}}}),
  findCredential:(credentialId)=>prisma.passkeyCredential.findFirst({where:{credentialId,revokedAt:null},include:{user:{select:{status:true}}}}),
};

/** Cryptographic core shared by Web and mobile. The response selects only a
 * credential; the authoritative user is always resolved from that credential. */
export async function verifyPasskeyAssertion(
  body:AuthenticationResponseJSON|null,
  channel:PasskeyAuthenticationChannel,
  verifier:AssertionVerifier=verifyAuthenticationResponse,
  lookup:PasskeyAssertionLookup=productionLookup,
  expectedType:PasskeyChallengeType=challengeType(channel),
):Promise<VerifiedPasskeyAssertion|null>{
  const challenge=responseChallenge(body);
  if(!body?.id||!challenge)return null;
  const type=expectedType;
  const now=new Date();
  const [record,credential]=await Promise.all([
    lookup.findChallenge(type,passkeyChallengeHash(challenge),now),
    lookup.findCredential(body.id),
  ]);
  if(!record||!credential||credential.user.status!=="ACTIVE")return null;
  try{
    const config=passkeyConfig();
    const verification=await verifier({
      response:body,
      expectedChallenge:challenge,
      expectedOrigin:passkeyExpectedOrigins(channel),
      expectedRPID:config.rpID,
      requireUserVerification:true,
      credential:{id:credential.credentialId,publicKey:new Uint8Array(credential.publicKey),counter:Number(credential.counter),transports:credential.transports as never},
    });
    if(!verification.verified)return null;
    return {
      challengeId:record.id,
      challengeType:type,
      credentialRowId:credential.id,
      userId:credential.userId,
      expectedCounter:credential.counter,
      newCounter:BigInt(verification.authenticationInfo.newCounter),
      credentialBackedUp:verification.authenticationInfo.credentialBackedUp,
    };
  }catch{return null}
}

/** Must run inside the same transaction as channel-specific session issuance.
 * The challenge update is the single-winner replay boundary. */
export async function consumeVerifiedPasskeyAssertion(tx:Prisma.TransactionClient,proof:VerifiedPasskeyAssertion){
  const now=new Date();
  const consumed=await tx.passkeyChallenge.updateMany({where:{id:proof.challengeId,type:proof.challengeType,consumedAt:null,expiresAt:{gt:now}},data:{consumedAt:now}});
  if(consumed.count!==1)throw new Error("PASSKEY_CHALLENGE_REPLAYED");
  const credential=await tx.passkeyCredential.updateMany({where:{id:proof.credentialRowId,userId:proof.userId,revokedAt:null,counter:proof.expectedCounter},data:{counter:proof.newCounter,lastUsedAt:now,backedUp:proof.credentialBackedUp}});
  if(credential.count!==1)throw new Error("PASSKEY_CREDENTIAL_CHANGED");
}
