import {prisma} from "@popwam/db";
import {csrfRejected,getApiUser,isSameOriginMutation,unauthorized} from "@/lib/api-auth";
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){if(!isSameOriginMutation(request))return csrfRejected();const user=await getApiUser();if(!user)return unauthorized();const {id}=await params;const result=await prisma.passkeyCredential.updateMany({where:{id,userId:user.id,revokedAt:null},data:{revokedAt:new Date()}});return result.count?Response.json({ok:true}):Response.json({ok:false,error:"NOT_FOUND"},{status:404})}
