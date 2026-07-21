import {prisma} from "@popwam/db";
import {getApiUser,unauthorized} from "@/lib/api-auth";
export async function GET(){const user=await getApiUser();if(!user)return unauthorized();const passkeys=await prisma.passkeyCredential.findMany({where:{userId:user.id,revokedAt:null},select:{id:true,name:true,deviceType:true,backedUp:true,createdAt:true,lastUsedAt:true},orderBy:{createdAt:"desc"}});return Response.json({passkeys},{headers:{"cache-control":"no-store"}})}
