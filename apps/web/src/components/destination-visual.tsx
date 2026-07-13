"use client";

import { useEffect,useState } from "react";
import type { DestinationType } from "@popwam/db";
import { DestinationIcon } from "@/components/destination-icon";

export function DestinationVisual({ type,iconKey,customIconUrl,size=22,className="" }: { type:DestinationType;iconKey?:string|null;customIconUrl?:string|null;size?:number;className?:string }) {
  const [failed,setFailed]=useState(false); useEffect(()=>setFailed(false),[customIconUrl]);
  return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl ${className}`} style={{width:size+18,height:size+18}}>{customIconUrl&&!failed?<img src={customIconUrl} alt="" className="size-full object-cover" onError={()=>setFailed(true)}/>:<DestinationIcon type={type} iconKey={iconKey} className="text-current"/>}</span>;
}
