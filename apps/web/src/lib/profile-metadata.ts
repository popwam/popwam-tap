import type { Metadata } from "next";
import { getPublicAppUrl } from "@popwam/shared";

export function profileMetadata(profile:{displayName:string;title:string|null;bio:string|null;avatarUrl:string|null;coverUrl:string|null;slug:string|null;id:string}):Metadata{
  const description=(profile.title||profile.bio||"POPWAM Tap digital profile").replace(/\s+/g," ").trim().slice(0,160); const url=`${getPublicAppUrl()}${profile.slug?`/p/${profile.slug}`:`/p/id/${profile.id}`}`; const image=profile.coverUrl||profile.avatarUrl||undefined;
  return { title:profile.displayName,description,manifest:`/manifest/profile/${profile.slug||profile.id}.webmanifest`,alternates:{canonical:url},openGraph:{type:"profile",title:profile.displayName,description,url,siteName:"POPWAM Tap",images:image?[{url:image,alt:profile.displayName}]:undefined},twitter:{card:image?"summary_large_image":"summary",title:profile.displayName,description,images:image?[image]:undefined} };
}
