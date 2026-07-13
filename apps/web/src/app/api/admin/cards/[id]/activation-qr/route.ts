import { getServerSession } from "next-auth";
import QRCode from "qrcode";
import { prisma } from "@popwam/db";
import { getActivationQrValue } from "@popwam/shared";
import { authOptions } from "@/lib/auth";
import { createOpaqueToken, hashActivationToken } from "@/lib/card-tokens";

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await getServerSession(authOptions);if(!session?.user?.id||session.user.role!=="ADMIN")return Response.json({error:"FORBIDDEN"},{status:403});
  const {id}=await params;const card=await prisma.card.findUnique({where:{id},select:{id:true,serialNumber:true,assignmentStatus:true,ownerId:true}});if(!card)return Response.json({error:"CARD_NOT_FOUND"},{status:404});if(card.ownerId||card.assignmentStatus!=="UNASSIGNED")return Response.json({error:"CARD_ALREADY_ASSIGNED"},{status:409});
  const activationToken=createOpaqueToken();const activationValue=getActivationQrValue(activationToken);await prisma.$transaction([prisma.card.update({where:{id},data:{activationTokenHash:hashActivationToken(activationToken)}}),prisma.auditLog.create({data:{actorId:session.user.id,operation:"admin.card.activation.rotate",targetId:id}})]);
  const svg=await QRCode.toString(activationValue,{type:"svg",errorCorrectionLevel:"H",width:1024,margin:4});
  return new Response(svg,{headers:{"content-type":"image/svg+xml; charset=utf-8","content-disposition":`attachment; filename="${card.serialNumber}-activation-qr.svg"`,"cache-control":"no-store, private"}});
}
