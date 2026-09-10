import type { Metadata } from "next";
import { PublicProfile } from "@/components/public-profile";
import { PublicStatus } from "@/components/public-status";
import { profileMetadata } from "@/lib/profile-metadata";
import { getFriendPrivacyView } from "@/lib/friend-privacy";
import { getProfileProjectionBySlugForViewer, getPublicProfileProjectionBySlug } from "@/lib/profile-projection";
import { getApiUser } from "@/lib/api-auth";
import { redirect } from "next/navigation";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const projection=await getPublicProfileProjectionBySlug(slug);if(!projection?.publiclyReadable)return{title:"Profile not found"};const profile={...projection.profile,title:projection.profile.showTitle?projection.profile.title:null,bio:projection.profile.showBio?projection.profile.bio:null,avatarUrl:projection.profile.showAvatar?projection.profile.avatarUrl:null,coverUrl:projection.profile.showCover?projection.profile.coverUrl:null};return{...profileMetadata(profile),...(projection.profile.access==="UNLISTED"?{robots:{index:false,follow:false}}:{})};}
export default async function SlugProfilePage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const viewer=await getApiUser();const projection=await getProfileProjectionBySlugForViewer(slug,viewer?.id);if(!projection)return <PublicStatus type="notFound"/>;if(projection.historical&&projection.canonicalSlug)redirect(`/p/${projection.canonicalSlug}`);const {profile}=projection;if(!projection.publiclyReadable||!projection.ownerId)return <PublicStatus type="unavailable"/>;const privacy=await getFriendPrivacyView(projection.ownerId);if(privacy?.level==="NOTHING"||(privacy?.level==="BUSINESS_ONLY"&&profile.type!=="ORGANIZATION"))return <PublicStatus type="unavailable"/>;return <PublicProfile profile={profile} ownerId={projection.ownerId} privacy={privacy} audience={projection.audience} showFriendAction={Boolean(viewer&&viewer.id!==projection.ownerId)}/>;}
