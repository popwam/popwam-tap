import { redirect } from "next/navigation";
import Link from "next/link";
import { after } from "next/server";
import { Prisma,prisma } from "@popwam/db";
import { isSafeDestinationUrl } from "@/lib/url";
import { decideTagResolution } from "@/lib/tag-resolution";
import { PublicProfile } from "@/components/public-profile";
import { PublicStatus } from "@/components/public-status";
import { getPublicProfileProjectionById, moduleUsesCanonicalPublicState } from "@/lib/profile-projection";
import { publishedShareDestination } from "@/lib/share-center";

const tagInclude={activeDestination:{include:{profile:{select:{id:true}}}}} satisfies Prisma.TagInclude;
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
    if(card.cardStatus==="LOST"||card.cardStatus==="STOLEN")return <PublicStatus type="lost"/>;
    if(card.cardStatus==="DISABLED"||card.cardStatus==="ARCHIVED"||card.cardStatus==="TRANSFER_PENDING")return <PublicStatus type="disabled"/>;
    if(!card.ownerId||card.assignmentStatus==="UNASSIGNED"||card.cardStatus==="CREATED"||card.cardStatus==="PROGRAMMED")return <CardActivationInstructions serialNumber={card.serialNumber} cardType={card.cardType} cardStatus={card.cardStatus} publicSlug={card.publicSlug}/>;
    const decision=decideTagResolution({status:"ACTIVE",activeDestination:card.activeDestination});
    if(decision.kind==="unconfigured")return <PublicStatus type="fallback"/>;
    recordCardOpen(card.id);
    if(decision.kind==="redirect"){
      if(card.activeDestination?.profileId){
        const projection=await getPublicProfileProjectionById(card.activeDestination.profileId);
        if(!projection?.publiclyReadable)return <PublicStatus type="unavailable"/>;
        const isContact=card.activeDestination.type==="VCF";
        if(isContact){if(!moduleUsesCanonicalPublicState(projection.profile,"CONTACT",true)||!projection.profile.showSaveContact)return <PublicStatus type="unavailable"/>;}
        else {const published=publishedShareDestination(projection,card.activeDestination.id);if(!published)return <PublicStatus type="unavailable"/>;redirect(published.url);}
      }
      if(!isSafeDestinationUrl(decision.url))return <PublicStatus type="fallback"/>;
      redirect(decision.url);
    }
    const projection=decision.profileId?await getPublicProfileProjectionById(decision.profileId):null;if(!projection?.publiclyReadable)return <PublicStatus type="unavailable"/>;return <PublicProfile profile={projection.profile} ownerId={projection.ownerId}/>;
  }
  let tag=await prisma.tag.findUnique({where:lookup==="token"?{token:code}:{shortCode:code},include:tagInclude});
  if(!tag&&lookup==="shortCode"){const alias=await prisma.tagAlias.findUnique({where:{code},include:{tag:{include:tagInclude}}});tag=alias?.tag||null;}
  if(!tag)return <PublicStatus type="notFound"/>;const decision=decideTagResolution(tag);if(decision.kind==="status")return <PublicStatus type={decision.status}/>;if(decision.kind==="unconfigured")return <PublicStatus type="fallback"/>;
  after(async()=>{try{await prisma.tag.update({where:{id:tag.id},data:{scanCount:{increment:1},lastScannedAt:new Date()}});}catch(error){console.error("legacy analytics failed",{operation:"tag.open",tagId:tag.id,error:error instanceof Error?error.name:"unknown"});}});
  if(decision.kind==="redirect"){
    if(tag.activeDestination?.profileId){
      const projection=await getPublicProfileProjectionById(tag.activeDestination.profileId);
      if(!projection?.publiclyReadable)return <PublicStatus type="unavailable"/>;
      const isContact=tag.activeDestination.type==="VCF";
      if(isContact){if(!moduleUsesCanonicalPublicState(projection.profile,"CONTACT",true)||!projection.profile.showSaveContact)return <PublicStatus type="unavailable"/>;}
      else {const published=publishedShareDestination(projection,tag.activeDestination.id);if(!published)return <PublicStatus type="unavailable"/>;redirect(published.url);}
    }
    if(!isSafeDestinationUrl(decision.url))return <PublicStatus type="fallback"/>;
    redirect(decision.url);
  }
  const profileId=tag.activeDestination?.profile?.id;const projection=profileId?await getPublicProfileProjectionById(profileId):null;if(!projection?.publiclyReadable)return <PublicStatus type="unavailable"/>;return <PublicProfile profile={projection.profile} ownerId={projection.ownerId}/>;
}

async function CardActivationInstructions({serialNumber,publicSlug}:{serialNumber:string;cardType:string;cardStatus:string;publicSlug:string}){
  const reference=`${"•".repeat(Math.max(6,serialNumber.length-3))}${serialNumber.slice(-3)}`;
  return <main className="flex min-h-screen items-center justify-center px-5"><div className="card max-w-lg p-8 text-center"><p className="text-xs font-bold uppercase tracking-widest text-brand-400">POP by POPWAM</p><h1 className="mt-3 text-2xl font-black">بطاقة جاهزة للتفعيل / Ready to activate</h1><p className="mt-4 leading-7 text-slate-400">استخدم رمز التفعيل المنفصل المرفق بالمنتج مع رمز الخدش المخفي. لا يتغير هذا الرابط بعد التفعيل.<br/>Use the separate activation identifier supplied with the product and its concealed scratch code. This permanent URL stays the same.</p><div className="mt-6 rounded-xl bg-white/5 p-3"><p className="text-xs text-slate-500">Product reference</p><p className="mt-1 font-mono text-xs" dir="ltr">{reference}</p></div><Link href={`/activate/card/${publicSlug}`} className="btn-primary mt-6 w-full">تفعيل هذه البطاقة / Activate this product</Link></div></main>;
}
