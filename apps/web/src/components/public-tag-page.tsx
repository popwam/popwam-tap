import { redirect } from "next/navigation";
import Link from "next/link";
import { after } from "next/server";
import { Prisma,prisma } from "@popwam/db";
import { isSafeDestinationUrl } from "@/lib/url";
import { decideTagResolution } from "@/lib/tag-resolution";
import { PublicProfile } from "@/components/public-profile";
import { PublicStatus } from "@/components/public-status";

const profileInclude={user:{select:{email:true}},fields:{orderBy:{sortOrder:"asc" as const}},uploads:{orderBy:{sortOrder:"asc" as const}},destinations:{orderBy:{sortOrder:"asc" as const}},services:{orderBy:{sortOrder:"asc" as const}},branches:{orderBy:{sortOrder:"asc" as const}},virtualCard:{include:{template:true}}} satisfies Prisma.ProfileInclude;
const tagInclude={activeDestination:{include:{profile:{include:profileInclude}}}} satisfies Prisma.TagInclude;
const cardSelect={id:true,serialNumber:true,publicSlug:true,cardType:true,assignmentStatus:true,cardStatus:true,ownerId:true,activeDestination:{select:{id:true,isActive:true,type:true,url:true,profileId:true}}} satisfies Prisma.CardSelect;

function recordCardOpen(cardId:string){
  after(async()=>{try{const now=new Date();const date=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));await prisma.$transaction([
    prisma.card.update({where:{id:cardId},data:{openCount:{increment:1},lastOpenedAt:now}}),
    prisma.cardOpenDaily.upsert({where:{cardId_date:{cardId,date}},create:{cardId,date,openCount:1},update:{openCount:{increment:1}}}),
  ]);}catch(error){console.error("card analytics failed",{operation:"card.open",cardId,error:error instanceof Error?error.name:"unknown"});}});
}

export async function PublicTagPage({code,lookup="shortCode"}:{code:string;lookup?:"shortCode"|"token"}){
  const card=await prisma.card.findUnique({where:lookup==="token"?{publicToken:code}:{publicSlug:code},select:cardSelect});
  if(card){
    if(card.cardStatus==="PAUSED")return <PublicStatus type="paused"/>;
    if(card.cardStatus==="LOST")return <PublicStatus type="lost"/>;
    if(card.cardStatus==="DISABLED"||card.cardStatus==="ARCHIVED")return <PublicStatus type="disabled"/>;
    if(!card.ownerId||card.assignmentStatus==="UNASSIGNED"||card.cardStatus==="CREATED"||card.cardStatus==="PROGRAMMED")return <CardActivationInstructions serialNumber={card.serialNumber} cardType={card.cardType} cardStatus={card.cardStatus} publicSlug={card.publicSlug}/>;
    const decision=decideTagResolution({status:"ACTIVE",activeDestination:card.activeDestination});
    if(decision.kind==="unconfigured")return <PublicStatus type="fallback"/>;
    recordCardOpen(card.id);
    if(decision.kind==="redirect"){if(!isSafeDestinationUrl(decision.url))return <PublicStatus type="fallback"/>;redirect(decision.url);}
    const profile=decision.profileId?await prisma.profile.findUnique({where:{id:decision.profileId},include:profileInclude}):null;if(!profile?.isPublic)return <PublicStatus type="unavailable"/>;return <PublicProfile profile={profile}/>;
  }
  let tag=await prisma.tag.findUnique({where:lookup==="token"?{token:code}:{shortCode:code},include:tagInclude});
  if(!tag&&lookup==="shortCode"){const alias=await prisma.tagAlias.findUnique({where:{code},include:{tag:{include:tagInclude}}});tag=alias?.tag||null;}
  if(!tag)return <PublicStatus type="notFound"/>;const decision=decideTagResolution(tag);if(decision.kind==="status")return <PublicStatus type={decision.status}/>;if(decision.kind==="unconfigured")return <PublicStatus type="fallback"/>;
  after(async()=>{try{await prisma.tag.update({where:{id:tag.id},data:{scanCount:{increment:1},lastScannedAt:new Date()}});}catch(error){console.error("legacy analytics failed",{operation:"tag.open",tagId:tag.id,error:error instanceof Error?error.name:"unknown"});}});
  if(decision.kind==="redirect"){if(!isSafeDestinationUrl(decision.url))return <PublicStatus type="fallback"/>;redirect(decision.url);}
  const profile=tag.activeDestination?.profile;if(!profile?.isPublic)return <PublicStatus type="unavailable"/>;return <PublicProfile profile={profile}/>;
}

async function CardActivationInstructions({serialNumber,cardType,cardStatus,publicSlug}:{serialNumber:string;cardType:string;cardStatus:string;publicSlug:string}){return <main className="flex min-h-screen items-center justify-center px-5"><div className="card max-w-lg p-8 text-center"><p className="text-xs font-bold uppercase tracking-widest text-brand-400">POP by POPWAM</p><h1 className="mt-3 text-2xl font-black">بطاقة جاهزة للتفعيل / Ready to activate</h1><p className="mt-4 leading-7 text-slate-400">امسح رمز QR المنفصل المرفق بالمنتج لتفعيل البطاقة. لا يتغير هذا الرابط بعد التفعيل.<br/>Scan the separate activation QR supplied with this product. This permanent URL stays the same.</p><dl className="mt-6 grid grid-cols-3 gap-3 text-start"><div className="rounded-xl bg-white/5 p-3"><dt className="text-xs text-slate-500">Serial</dt><dd className="mt-1 font-mono text-xs" dir="ltr">{serialNumber}</dd></div><div className="rounded-xl bg-white/5 p-3"><dt className="text-xs text-slate-500">Type</dt><dd className="mt-1 font-mono text-xs" dir="ltr">{cardType}</dd></div><div className="rounded-xl bg-white/5 p-3"><dt className="text-xs text-slate-500">Status</dt><dd className="mt-1 font-mono text-xs" dir="ltr">{cardStatus}</dd></div></dl><Link href={`/activate/card/${publicSlug}`} className="btn-primary mt-6 w-full">تفعيل هذه البطاقة / Activate this card</Link></div></main>}
