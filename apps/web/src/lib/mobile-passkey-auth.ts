import "server-only";
import {prisma,type SystemRole} from "@popwam/db";
import type {AuthenticationResponseJSON} from "@simplewebauthn/server";
import {issueMobileSession} from "@/lib/mobile-auth";
import {consumeVerifiedPasskeyAssertion,verifyPasskeyAssertion} from "@/lib/passkey-authentication";
import {mobilePasskeyAuditMetadata,runMobilePasskeyAuthentication} from "@/lib/mobile-passkey-contract";

export async function authenticateMobilePasskey(assertion:AuthenticationResponseJSON|null,deviceName?:string,appVersion?:string){
  try{return await runMobilePasskeyAuthentication(assertion,deviceName,{
    verify:value=>verifyPasskeyAssertion(value,"MOBILE"),
    finalize:(proof,name)=>prisma.$transaction(async tx=>{
      await consumeVerifiedPasskeyAssertion(tx,proof);
      const user=await tx.user.findFirst({where:{id:proof.userId,status:"ACTIVE"},select:{id:true,name:true,phone:true,email:true,role:true,locale:true}});
      if(!user)throw new Error("PASSKEY_USER_INACTIVE");
      await tx.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}});
      await tx.auditLog.create({data:{actorId:user.id,operation:"auth.passkey.verified",route:"/api/mobile/auth/passkey/verify",metadata:mobilePasskeyAuditMetadata()}});
      const session=await issueMobileSession(tx,user as {id:string;role:SystemRole},name,undefined,{authMethod:"PASSKEY",appVersion});
      return {session,user};
    },{isolationLevel:"Serializable",maxWait:10_000,timeout:30_000}),
  })}catch{return null}
}
