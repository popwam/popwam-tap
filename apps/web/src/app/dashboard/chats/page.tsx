import Link from "next/link";
import {prisma} from "@popwam/db";
import {startChat} from "@/app/social-actions";
import {PageHeading} from "@/components/page-heading";
import {requireUser} from "@/lib/session";

export default async function ChatsPage(){const user=await requireUser();const memberships=await prisma.chatMember.findMany({
  where:{userId:user.id},
  include:{chat:{include:{
    members:{include:{user:{select:{id:true,username:true,name:true}}}},
    messages:{take:1,orderBy:{createdAt:"desc"},include:{sender:{select:{name:true}}}},
  }}},
  orderBy:{chat:{updatedAt:"desc"}},
});const rows=await Promise.all(memberships.map(async membership=>({...membership,unread:await prisma.message.count({where:{chatId:membership.chatId,senderId:{not:user.id},createdAt:{gt:membership.lastReadAt||membership.joinedAt}}})})));return <><PageHeading eyebrow="Social" title="Chats / المحادثات" description="Private one-to-one chats are visible only to their members. Admin moderation access begins only from a submitted report and is audit logged."/><form action={startChat} className="card mb-6 flex flex-wrap items-end gap-3 p-5"><label className="min-w-64 flex-1"><span className="label">Accepted friend username</span><input className="input" name="username" placeholder="@friend" required/></label><button className="btn-primary">Open chat / فتح المحادثة</button></form><div className="space-y-3">{rows.map(row=>{const other=row.chat.members.find(member=>member.userId!==user.id)?.user;const last=row.chat.messages[0];return <Link href={`/dashboard/chats/${row.chatId}`} className="card flex items-center justify-between gap-4 p-5 hover:border-brand-400/30" key={row.id}><div><strong>{other?.name||`@${other?.username}`}</strong><p className="mt-1 line-clamp-1 text-sm text-slate-500">{last?`${last.sender.name||"User"}: ${last.body||"Attachment"}`:"No messages yet"}</p></div>{row.unread>0&&<span className="rounded-full bg-brand-400 px-2.5 py-1 text-xs font-black text-black">{row.unread}</span>}</Link>})}{!rows.length&&<div className="card p-8 text-center text-slate-500">No chats yet / لا توجد محادثات</div>}</div></>}
