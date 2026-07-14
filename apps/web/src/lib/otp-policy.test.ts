import {describe,expect,it} from "vitest";
import {isOtpUsable,OTP_EXPIRY_MINUTES,OTP_HOURLY_SEND_LIMIT,OTP_MAX_ATTEMPTS,OTP_RESEND_SECONDS} from "./otp-policy";
describe("secure OTP policy",()=>{
  it("uses the required production limits",()=>{expect(OTP_EXPIRY_MINUTES).toBe(5);expect(OTP_RESEND_SECONDS).toBe(60);expect(OTP_HOURLY_SEND_LIMIT).toBe(5);expect(OTP_MAX_ATTEMPTS).toBe(10);});
  it("rejects expired, used and exhausted challenges",()=>{const future=new Date(Date.now()+60_000);expect(isOtpUsable({consumedAt:null,expiresAt:future,attempts:0,maxAttempts:10})).toBe("VALID");expect(isOtpUsable({consumedAt:new Date(),expiresAt:future,attempts:0,maxAttempts:10})).toBe("USED");expect(isOtpUsable({consumedAt:null,expiresAt:new Date(0),attempts:0,maxAttempts:10})).toBe("EXPIRED");expect(isOtpUsable({consumedAt:null,expiresAt:future,attempts:10,maxAttempts:10})).toBe("RATE_LIMITED");});
});
