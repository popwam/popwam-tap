import {notFound} from "next/navigation";
import {prisma} from "@popwam/db";
import {updateMessageReport} from "@/app/social-actions";
import {Badge} from "@/components/badge";
import {PageHeading} from "@/components/page-heading";
import {requireAdmin} from "@/lib/session";

export default async function ReportPage({params}:{params:Promise<{reportId:string}>}){const admin=await requireAdmin();const {reportId}=await params;const report=await prisma.messageReport.findUnique({
  where:{id:reportId},
  include:{
    reporter:{select:{name:true,email:true}},
    message:{
      include:{
        chat:{
          include:{
            messages:{orderBy:{createdAt:"asc"},include:{sender:{select:{name:true,username:true}},attachment:true}},
          },
        },
      },
    },
  },
});if(!report)notFound();await prisma.auditLog.create({data:{actorId:admin.id,operation:"moderation.report.access",targetId:report.id,metadata:{chatId:report.message.chatId,scope:"reported-conversation"}}});return <><PageHeading eyebrow="Audited moderation access" title="Reported conversation / المحادثة المبلّغ عنها" description="This view exists only because a report was submitted. The preserved conversation cannot be silently edited or deleted here."/><section className="card mb-5 p-5"><div className="flex justify-between gap-3"><div><strong>Reporter: {report.reporter.name||report.reporter.email}</strong><p className="mt-2 text-sm text-slate-400">Reason: {report.reason}</p></div><Badge value={report.status}/></div></section><section className="card max-h-[55vh] space-y-3 overflow-y-auto p-5">{report.message.chat.messages.map(message=><article className={`rounded-xl p-4 ${message.id===report.messageId?"border border-amber-400/30 bg-amber-400/10":"bg-white/5"}`} key={message.id}><strong className="text-xs">{message.sender.name||`@${message.sender.username}`}</strong><p className="mt-1 whitespace-pre-wrap text-sm">{message.body||"Attachment"}</p>{message.attachment&&<span className="text-xs text-slate-500">Preserved attachment: {message.attachment.originalFilename}</span>}</article>)}</section><form action={updateMessageReport} className="card mt-5 grid gap-3 p-5 sm:grid-cols-2"><input type="hidden" name="reportId" value={report.id}/><select className="input" name="status" defaultValue={report.status}><option>OPEN</option><option>REVIEWING</option><option>RESOLVED</option><option>DISMISSED</option></select><input className="input" name="reviewNote" defaultValue={report.reviewNote||""} placeholder="Moderation note"/><button className="btn-primary sm:col-span-2">Save review</button></form></>}
