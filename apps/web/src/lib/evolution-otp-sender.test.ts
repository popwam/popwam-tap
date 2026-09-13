import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
import { EvolutionOtpSender, otpConfig } from "./evolution-otp-sender";
const env={ EVOLUTION_API_URL:"https://provider.example", EVOLUTION_API_KEY:"test-secret", EVOLUTION_INSTANCE:"pop-test", OTP_PEPPER:"p".repeat(32) };
const input={phone:"+201001234567",code:"123456",ttl:300,locale:"en"};
const info=()=>Response.json({version:"2.3.7"});
afterEach(()=>vi.restoreAllMocks());
describe("Evolution v2 sender",()=>{
  it.each(["en","ar","fr"])("sends localized %s through the installed v2 contract",async locale=>{
    const http=vi.fn().mockResolvedValueOnce(info()).mockResolvedValueOnce(Response.json({key:{id:"accepted"},status:"PENDING"}));
    await new EvolutionOtpSender(env,http).send({...input,locale});
    expect(http.mock.calls[1][0]).toBe("https://provider.example/message/sendText/pop-test");
    const options=http.mock.calls[1][1];expect(options.headers.apikey).toBe("test-secret");expect(options.redirect).toBe("error");
    expect(JSON.parse(options.body)).toMatchObject({number:"201001234567",linkPreview:false});
    expect(JSON.parse(options.body).text).toContain("123456");
  });
  it("fails missing config without transport",async()=>{const http=vi.fn();await expect(new EvolutionOtpSender({},http).send(input)).rejects.toMatchObject({code:"OTP_CONFIGURATION_UNAVAILABLE"});expect(http).not.toHaveBeenCalled()});
  it.each(["http://provider.example","https://user:password@provider.example","https://provider.example?secret=1"])("refuses unsafe provider base %s",async url=>{await expect(new EvolutionOtpSender({...env,EVOLUTION_API_URL:url},vi.fn()).send(input)).rejects.toMatchObject({code:"OTP_CONFIGURATION_UNAVAILABLE"})});
  it("rejects unsupported versions without trying old endpoints",async()=>{const http=vi.fn().mockResolvedValue(Response.json({version:"1.8.7"}));await expect(new EvolutionOtpSender(env,http).send(input)).rejects.toMatchObject({code:"OTP_PROVIDER_UNAVAILABLE"});expect(http).toHaveBeenCalledTimes(1)});
  it("maps provider errors without exposing response or logging OTP",async()=>{
    const log=vi.spyOn(console,"log"),error=vi.spyOn(console,"error");
    const http=vi.fn().mockResolvedValueOnce(info()).mockResolvedValueOnce(Response.json({secret:"123456"},{status:500}));
    await expect(new EvolutionOtpSender(env,http).send(input)).rejects.toMatchObject({message:"OTP_DELIVERY_FAILED"});expect(log).not.toHaveBeenCalled();expect(error).not.toHaveBeenCalled();
  });
  it("rejects malformed success payload",async()=>{const http=vi.fn().mockResolvedValueOnce(info()).mockResolvedValueOnce(Response.json({ok:true}));await expect(new EvolutionOtpSender(env,http).send(input)).rejects.toMatchObject({code:"OTP_DELIVERY_FAILED"})});
  it("bounds provider timeout",async()=>{vi.spyOn(AbortSignal,"timeout").mockReturnValue(AbortSignal.abort());const http=vi.fn().mockRejectedValue(new Error("secret"));await expect(new EvolutionOtpSender(env,http).send(input)).rejects.toMatchObject({code:"OTP_PROVIDER_TIMEOUT"})});
  it("uses requested defaults and validates numeric configuration",()=>{expect(otpConfig(env)).toEqual({ttl:300,cooldown:60,attempts:5});expect(otpConfig({...env,OTP_TTL_SECONDS:"180",OTP_RESEND_COOLDOWN_SECONDS:"90",OTP_MAX_ATTEMPTS:"3"})).toEqual({ttl:180,cooldown:90,attempts:3});expect(()=>otpConfig({...env,OTP_MAX_ATTEMPTS:"NaN"})).toThrow("OTP_CONFIGURATION_UNAVAILABLE")});
});
