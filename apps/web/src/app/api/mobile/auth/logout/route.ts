import {revokeMobileSession} from "@/lib/mobile-auth";
export async function POST(request:Request){const body=await request.json().catch(()=>({}));await revokeMobileSession(String(body.refreshToken||""));return Response.json({ok:true},{headers:{"cache-control":"no-store"}})}
