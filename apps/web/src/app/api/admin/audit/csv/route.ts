import { prisma } from "@popwam/db";
import { getApiUser } from "@/lib/api-auth";
import { isAdminRole } from "@/lib/admin-access";
import { readableAuditMessage } from "@/lib/audit";
const csv=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;
export async function GET(request:Request){const admin=await getApiUser();if(!admin||!isAdminRole(admin.role))return Response.json({error:"FORBIDDEN"},{status:403});const url=new URL(request.url);const action=url.searchParams.get("action")||undefined;const logs=await prisma.auditLog.findMany({where:action?{operation:{contains:action,mode:"insensitive"}}:{},include:{actor:true},orderBy:{createdAt:"desc"},take:10000});const body=[["timestamp","actor","action","message"].map(csv).join(","),...logs.map(log=>[log.createdAt.toISOString(),log.actor?.email||"system",log.operation,readableAuditMessage({actor:log.actor?.name||log.actor?.email,operation:log.operation})].map(csv).join(","))].join("\r\n");return new Response(body,{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":"attachment; filename=popwam-audit.csv","cache-control":"no-store, private"}});}
