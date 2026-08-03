import "server-only";
import {prisma,type SystemRole} from "@popwam/db";
import type {AuthenticationResponseJSON} from "@simplewebauthn/server";
import {issueMobileSession} from "@/lib/mobile-auth";
import {consumeVerifiedPasskeyAssertion,verifyPasskeyAssertion} from "@/lib/passkey-authentication";
import {mobilePasskeyAuditMetadata,runMobilePasskeyAuthentication} from "@/lib/mobile-passkey-contract";
import {MOBILE_AUTH_CONTRACT_VERSION} from "@/lib/mobile-auth-contract-v2";
import {mobileChallengeView} from "@/lib/mobile-enrollment";

export async function authenticateMobilePasskey(assertion:AuthenticationResponseJSON|null,deviceName?:string,appVersion?:string,contract?:{version:number;challengeId?:string}){
  try{return await runMobilePasskeyAuthentication(assertion,deviceName,{
    verify:value=>verifyPasskeyAssertion(value,"MOBILE"),
    finalize:(proof,name)=>prisma.$transaction(async tx=>{
      await consumeVerifiedPasskeyAssertion(tx,proof);
      const user=await tx.user.findFirst({where:{id:proof.userId,status:"ACTIVE"},select:{id:true,name:true,phone:true,email:true,role:true,locale:true}});
      if(!user)throw new Error("PASSKEY_USER_INACTIVE");
      const mobileChallenge=contract?.version===MOBILE_AUTH_CONTRACT_VERSION
        ? await tx.mobileAuthChallenge.findFirst({where:{id:contract.challengeId||"",userId:user.id,state:"OPEN",revokedAt:null,expiresAt:{gt:new Date()},allowedMethods:{has:"PASSKEY"}}})
        : null;
      if(contract?.version===MOBILE_AUTH_CONTRACT_VERSION&&!mobileChallenge)throw new Error("AUTH_CHALLENGE_INVALID");
      if(mobileChallenge){
        const consumed=await tx.mobileAuthChallenge.updateMany({where:{id:mobileChallenge.id,state:"OPEN",consumedAt:null},data:{state:"CONSUMED",consumedAt:new Date()}});
        if(consumed.count!==1)throw new Error("AUTH_CHALLENGE_REPLAYED");
      }
      await tx.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}});
      await tx.auditLog.create({data:{actorId:user.id,operation:"auth.passkey.verified",route:"/api/mobile/auth/passkey/verify",metadata:mobilePasskeyAuditMetadata()}});
      const session=await issueMobileSession(tx,user as {id:string;role:SystemRole},name,undefined,{authMethod:"PASSKEY",appVersion});
      return {session,user,authentication:mobileChallenge?mobileChallengeView(mobileChallenge,{nextAction:"AUTHENTICATED",sessionScope:"FULL"}):null};
    },{isolationLevel:"Serializable",maxWait:10_000,timeout:30_000}),
  })}catch{return null}
}
