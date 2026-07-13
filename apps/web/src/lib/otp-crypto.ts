import {createHmac,randomInt,timingSafeEqual} from "node:crypto";

function pepper(){const value=process.env.OTP_PEPPER||process.env.NEXTAUTH_SECRET;if(!value)throw new Error("OTP_PEPPER_NOT_CONFIGURED");return value;}
export function createOtpCode(){return String(randomInt(0,1_000_000)).padStart(6,"0");}
export function hashOtp(phone:string,code:string){return createHmac("sha256",pepper()).update(`${phone}:${code}`,"utf8").digest("hex");}
export function otpMatches(phone:string,code:string,expected:string){const a=Buffer.from(hashOtp(phone,code),"hex");const b=Buffer.from(expected,"hex");return a.length===b.length&&timingSafeEqual(a,b);}
export function hashPhone(phone:string){return createHmac("sha256",pepper()).update(`phone:${phone}`,"utf8").digest("hex");}
