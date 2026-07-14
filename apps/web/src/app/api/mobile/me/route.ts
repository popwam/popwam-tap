import {getMobileUser,mobileUnauthorized} from "@/lib/mobile-auth";
export async function GET(request:Request){const user=await getMobileUser(request);return user?Response.json({ok:true,user},{headers:{"cache-control":"no-store"}}):mobileUnauthorized()}
