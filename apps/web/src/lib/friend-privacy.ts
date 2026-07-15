import "server-only";
import {getServerSession} from "next-auth";
import {prisma} from "@popwam/db";
import {authOptions} from "./auth";
import {canonicalUserPair} from "./social";

export type FriendPrivacyView={level:"FULL_PROFILE"|"CONTACT_ONLY"|"SELECTED_LINKS"|"BUSINESS_ONLY"|"NOTHING";selectedDestinationIds:string[]};
export async function getFriendPrivacyView(ownerId:string):Promise<FriendPrivacyView|null>{const session=await getServerSession(authOptions);const viewerId=session?.user?.id;if(!viewerId||viewerId===ownerId)return null;const pair=canonicalUserPair(ownerId,viewerId);const friendship=await prisma.friendship.findFirst({where:{...pair,status:"ACCEPTED"},select:{id:true}});if(!friendship)return null;const rule=await prisma.friendPrivacyRule.findUnique({where:{ownerId_friendId:{ownerId,friendId:viewerId}}});if(!rule)return {level:"FULL_PROFILE",selectedDestinationIds:[]};return{level:rule.level,selectedDestinationIds:Array.isArray(rule.selectedDestinationIds)?rule.selectedDestinationIds.map(String):[]};}
