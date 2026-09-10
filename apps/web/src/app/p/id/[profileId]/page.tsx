import type { Metadata } from "next";
import { PublicProfile } from "@/components/public-profile";
import { PublicStatus } from "@/components/public-status";
import { profileMetadata } from "@/lib/profile-metadata";
import { getFriendPrivacyView } from "@/lib/friend-privacy";
import { getPublicProfileProjectionById } from "@/lib/profile-projection";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{profileId:string}>}):Promise<Metadata>{const {profileId}=await params;const projection=await getPublicProfileProjectionById(profileId);if(!projection?.publiclyReadable)return{title:"Profile not found"};const profile={...projection.profile,title:projection.profile.showTitle?projection.profile.title:null,bio:projection.profile.showBio?projection.profile.bio:null,avatarUrl:projection.profile.showAvatar?projection.profile.avatarUrl:null,coverUrl:projection.profile.showCover?projection.profile.coverUrl:null};return{...profileMetadata(profile),...(projection.profile.access==="UNLISTED"?{robots:{index:false,follow:false}}:{})};}
export default async function IdProfilePage({params}:{params:Promise<{profileId:string}>}){const {profileId}=await params;const projection=await getPublicProfileProjectionById(profileId);if(!projection)return <PublicStatus type="notFound"/>;const {profile}=projection;if(!projection.publiclyReadable||!projection.ownerId)return <PublicStatus type="unavailable"/>;const privacy=await getFriendPrivacyView(projection.ownerId);if(privacy?.level==="NOTHING"||(privacy?.level==="BUSINESS_ONLY"&&profile.type!=="ORGANIZATION"))return <PublicStatus type="unavailable"/>;return <PublicProfile profile={profile} ownerId={projection.ownerId} privacy={privacy}/>;}
