import type { Metadata } from "next";
import { getPublicAppUrl } from "@popwam/shared";

export function profileMetadata(profile:{displayName:string;title:string|null;bio:string|null;avatarUrl:string|null;coverUrl:string|null;slug:string|null;id:string;allowInstallable?:boolean}):Metadata{
  const description=(profile.title||profile.bio||"POP by POPWAM digital profile").replace(/\s+/g," ").trim().slice(0,160); const url=`${getPublicAppUrl()}${profile.slug?`/p/${profile.slug}`:`/p/id/${profile.id}`}`; const image=profile.coverUrl||profile.avatarUrl||undefined;
  return { title:{absolute:`${profile.displayName} | POP by POPWAM`},description,manifest:profile.allowInstallable?`/manifest/profile/${profile.slug||profile.id}.webmanifest`:undefined,alternates:{canonical:url},openGraph:{type:"profile",title:`${profile.displayName} | POP by POPWAM`,description,url,siteName:"POP by POPWAM",images:image?[{url:image,alt:profile.displayName}]:undefined},twitter:{card:image?"summary_large_image":"summary",title:`${profile.displayName} | POP by POPWAM`,description,images:image?[image]:undefined} };
}
