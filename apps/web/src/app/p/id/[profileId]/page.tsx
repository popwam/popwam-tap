import type { Metadata } from "next";
import { prisma } from "@popwam/db";
import { PublicProfile } from "@/components/public-profile";
import { PublicStatus } from "@/components/public-status";
import { profileMetadata } from "@/lib/profile-metadata";
import { getFriendPrivacyView } from "@/lib/friend-privacy";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{profileId:string}>}):Promise<Metadata>{const {profileId}=await params;const profile=await prisma.profile.findUnique({where:{id:profileId},select:{id:true,slug:true,displayName:true,title:true,bio:true,avatarUrl:true,coverUrl:true,allowInstallable:true}});return profile?profileMetadata(profile):{title:"Profile not found"};}
export default async function IdProfilePage({params}:{params:Promise<{profileId:string}>}){const {profileId}=await params;const profile=await prisma.profile.findUnique({where:{id:profileId},include:{user:{select:{email:true}},fields:{orderBy:{sortOrder:"asc"}},uploads:{orderBy:{sortOrder:"asc"}},destinations:{orderBy:{sortOrder:"asc"}},services:{orderBy:{sortOrder:"asc"}},branches:{orderBy:{sortOrder:"asc"}},virtualCard:{include:{template:true}}}});if(!profile)return <PublicStatus type="notFound"/>;if(!profile.isPublic)return <PublicStatus type="unavailable"/>;const privacy=await getFriendPrivacyView(profile.userId);if(privacy?.level==="NOTHING"||(privacy?.level==="BUSINESS_ONLY"&&profile.type!=="ORGANIZATION"))return <PublicStatus type="unavailable"/>;return <PublicProfile profile={profile} privacy={privacy}/>;}
