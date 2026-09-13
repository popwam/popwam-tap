import { z } from "zod";
import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { requestMobileOtp, OtpError } from "@/lib/mobile-otp";
import { otpFailure, otpHeaders } from "@/lib/mobile-otp-http";
export const runtime = "nodejs";
const schema = z.object({ phone: z.string().max(64), countryCode: z.string().length(2).optional(), locale: z.enum(["ar", "en", "fr"]).optional() });
export async function POST(request: Request) {
  try {
    if (!authRequestAllowed(request, "mobile-otp-request", 6)) throw new OtpError("OTP_RATE_LIMITED", 429, 60);
    const body = schema.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new OtpError("PHONE_INVALID", 400);
    const source = request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
    return Response.json(await requestMobileOtp({ ...body.data, source }), { headers: otpHeaders });
  } catch (error) { return otpFailure(error); }
}
