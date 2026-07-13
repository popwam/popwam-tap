import type { Metadata } from "next";
import { prisma } from "@popwam/db";
import { profileMetadata } from "./profile-metadata";

const select={activeDestination:{select:{type:true,profile:{select:{id:true,slug:true,displayName:true,title:true,bio:true,avatarUrl:true,coverUrl:true}}}}} as const;
export async function tagMetadata(code:string,lookup:"shortCode"|"token"):Promise<Metadata>{let tag=await prisma.tag.findUnique({where:lookup==="token"?{token:code}:{shortCode:code},select});if(!tag&&lookup==="shortCode"){const alias=await prisma.tagAlias.findUnique({where:{code},select:{tag:{select}}});tag=alias?.tag||null;}const profile=tag?.activeDestination?.type==="PROFILE"?tag.activeDestination.profile:null;return profile?profileMetadata(profile):{title:"POPWAM Tap"};}
