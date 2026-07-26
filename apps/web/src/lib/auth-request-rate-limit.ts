import "server-only";
import {createHash} from "node:crypto";

type Bucket={startedAt:number;count:number};
const buckets=new Map<string,Bucket>();

/** Privacy-safe, process-local auth throttling. It supplements challenge
 * expiry/single-use checks without keying on a claimed user identifier. */
export function authRequestAllowed(request:Request,scope:string,limit:number,windowMs=60_000,now=Date.now()){
  const forwarded=(request.headers.get("x-forwarded-for")||"").split(",").map(item=>item.trim()).filter(Boolean);
  const address=request.headers.get("x-real-ip")?.trim()||forwarded.at(-1)||"unknown";
  const agent=(request.headers.get("user-agent")||"unknown").slice(0,160);
  const key=createHash("sha256").update(`${scope}\0${address}\0${agent}`).digest("base64url");
  const current=buckets.get(key);
  if(!current||now-current.startedAt>=windowMs){buckets.set(key,{startedAt:now,count:1});return true}
  if(current.count>=limit)return false;
  current.count+=1;
  if(buckets.size>5_000)for(const [candidate,value] of buckets)if(now-value.startedAt>=windowMs)buckets.delete(candidate);
  return true;
}
