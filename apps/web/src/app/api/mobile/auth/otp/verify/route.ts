import { z } from "zod";
import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { verifyMobileOtp, OtpError } from "@/lib/mobile-otp";
import { otpFailure, otpHeaders } from "@/lib/mobile-otp-http";
export const runtime = "nodejs";
const schema = z.object({ challengeId: z.string().max(80), phone: z.string().max(64), code: z.string().regex(/^\d{6}$/), deviceName: z.string().max(120).optional() });
export async function POST(request: Request) {
  try {
    if (!authRequestAllowed(request, "mobile-otp-verify", 20)) throw new OtpError("OTP_RATE_LIMITED", 429, 60);
    const body = schema.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new OtpError("OTP_INVALID", 400);
    return Response.json(await verifyMobileOtp({ ...body.data, appVersion: request.headers.get("x-pop-app-version")?.slice(0, 32) }), { headers: otpHeaders });
  } catch (error) { return otpFailure(error); }
}
