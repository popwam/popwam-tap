import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
vi.mock("server-only",()=>({}));
const mocks=vi.hoisted(()=>({db:{ } as any, issue:vi.fn(), bootstrap:vi.fn()}));
vi.mock("@popwam/db",async()=>({...await vi.importActual<typeof import("@popwam/db")>("@popwam/db"),prisma:mocks.db}));
vi.mock("./mobile-auth",()=>({issueMobileSession:mocks.issue}));
vi.mock("./profile-bootstrap",()=>({markNewAccountForProfileBootstrap:mocks.bootstrap}));
import { requestMobileOtp, verifyMobileOtp, loginPhone } from "./mobile-otp";
import { otpMatches } from "./otp-crypto";
import { OtpError } from "./evolution-otp-sender";
import { POST as requestRoute } from "../app/api/mobile/auth/otp/request/route";
import { POST as verifyRoute } from "../app/api/mobile/auth/otp/verify/route";

const phone="+201001234567";
let rows:any[],users:any[],code:string,id:string,clock:number,source:number;
const sender={send:vi.fn(async(input:any)=>{code=input.code})};
const match=(row:any,where:any):boolean=>Object.entries(where).every(([key,value]:any)=>{
  if(key==="OR")return value.some((v:any)=>match(row,v));
  if(value && typeof value==="object" && !(value instanceof Date))return (!value.gte||row[key]>=value.gte)&&(!value.gt||row[key]>value.gt);
  return row[key]===value;
});
beforeEach(()=>{
  vi.stubEnv("OTP_PEPPER","test-only-pepper".repeat(4));vi.stubEnv("OTP_TTL_SECONDS","300");vi.stubEnv("OTP_RESEND_COOLDOWN_SECONDS","60");vi.stubEnv("OTP_MAX_ATTEMPTS","5");
  clock=Date.UTC(2026,8,11);vi.spyOn(Date,"now").mockImplementation(()=>clock);vi.useFakeTimers({toFake:["Date"]});vi.setSystemTime(clock);
  rows=[];users=[];source=0;sender.send.mockClear();mocks.issue.mockReset().mockResolvedValue({accessToken:"access",refreshToken:"refresh"});mocks.bootstrap.mockReset();
  const update=(args:any)=>{const row=rows.find(r=>match(r,args.where));if(!row)throw Error("missing");for(const [key,value] of Object.entries(args.data))row[key]=(value as any)?.increment?row[key]+(value as any).increment:value;return row};
  Object.assign(mocks.db,{
    phoneCountryConfig:{findUnique:vi.fn().mockResolvedValue({enabled:true})},
    otpChallenge:{findFirst:vi.fn(async({where}:any)=>structuredClone(rows.filter(r=>match(r,where)).at(-1)||null)),count:vi.fn(async({where}:any)=>rows.filter(r=>match(r,where)).length),
      create:vi.fn(async({data}:any)=>{const row={attempts:0,consumedAt:null,deliveryStatus:"PENDING",...data};rows.push(row);return row}),update:vi.fn(async(args:any)=>update(args)),
      updateMany:vi.fn(async(args:any)=>{const found=rows.filter(r=>match(r,args.where));for(const row of found)update({where:{id:row.id},data:args.data});return {count:found.length}})},
    user:{findMany:vi.fn(async({where}:any)=>users.filter(u=>match(u,where))),create:vi.fn(async({data}:any)=>{const user={id:`user-${users.length}`,status:"ACTIVE",role:"USER",locale:"en",...data};users.push(user);return user}),update:vi.fn(async({where,data}:any)=>Object.assign(users.find(u=>u.id===where.id),data))},
    plan:{findUnique:vi.fn().mockResolvedValue({id:"free-plan"})},userPlan:{create:vi.fn()},onboardingProgress:{findUnique:vi.fn().mockResolvedValue(null)},auditLog:{create:vi.fn()},
  });
  // Deterministic serial transaction harness, including rollback. No remote DB.
  let tail=Promise.resolve();mocks.db.$transaction=vi.fn((operation:any)=>{const work=tail.then(async()=>{const saved=structuredClone({rows,users});try{return await operation(mocks.db)}catch(e){rows=saved.rows;users=saved.users;throw e}});tail=work.catch(()=>undefined);return work});
});
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllEnvs()});
async function request(){const response=await requestMobileOtp({phone,countryCode:"EG",source:`source-${source++}`},sender);id=response.challengeId;return response}
async function verify(value=code,number=phone,challenge=id){return verifyMobileOtp({phone:number,challengeId:challenge,code:value})}
function advance(ms:number){clock+=ms;vi.setSystemTime(clock)}

describe("WhatsApp OTP request",()=>{
  it("normalizes national and international phone formats",()=>{expect(loginPhone("01001234567","EG").e164).toBe(phone);expect(loginPhone("00 20 100 123 4567","EG").e164).toBe(phone)});
  it.each(["abc123","++201001234567","123",""])("rejects malformed %s before delivery",async number=>{await expect(requestMobileOtp({phone:number,source:"ip"},sender)).rejects.toMatchObject({code:"PHONE_INVALID"});expect(sender.send).not.toHaveBeenCalled()});
  it("honors enabled countries",async()=>{mocks.db.phoneCountryConfig.findUnique.mockResolvedValue({enabled:false});await expect(request()).rejects.toMatchObject({code:"PHONE_COUNTRY_UNAVAILABLE"});expect(sender.send).not.toHaveBeenCalled()});
  it("persists only challenge-bound keyed hash and neutral metadata",async()=>{const response=await request();expect(code).toMatch(/^\d{6}$/);expect(rows[0].otpHash).toMatch(/^[a-f0-9]{64}$/);expect(otpMatches(`${id}:${phone}`,code,rows[0].otpHash)).toBe(true);expect(rows[0].code).toBeUndefined();expect(response).toEqual({ok:true,challengeId:id,expiresInSeconds:300,resendAfterSeconds:60});expect(mocks.db.user.findMany).not.toHaveBeenCalled()});
  it("rejects cooldown and invalidates older codes after permitted resend",async()=>{await request();const old=id;await expect(request()).rejects.toMatchObject({code:"OTP_COOLDOWN",retryAfterSeconds:60});advance(60000);await request();expect(id).not.toBe(old);expect(rows[0].consumedAt).not.toBeNull()});
  it("enforces phone limit including failed sends",async()=>{for(let i=0;i<5;i++){await request();advance(60000)}await expect(request()).rejects.toMatchObject({code:"OTP_RATE_LIMITED"});expect(sender.send).toHaveBeenCalledTimes(5)});
  it("enforces persistent request-source limit",async()=>{mocks.db.otpChallenge.count.mockResolvedValueOnce(0).mockResolvedValueOnce(30);await expect(request()).rejects.toMatchObject({code:"OTP_RATE_LIMITED"});expect(sender.send).not.toHaveBeenCalled()});
  it("maps failed delivery and makes its challenge unusable",async()=>{sender.send.mockRejectedValueOnce(new OtpError("OTP_PROVIDER_TIMEOUT"));await expect(request()).rejects.toMatchObject({code:"OTP_PROVIDER_TIMEOUT"});expect(rows[0]).toMatchObject({deliveryStatus:"FAILED"});expect(rows[0].consumedAt).not.toBeNull()});
  it("concurrent requests admit only one delivery during cooldown",async()=>{const results=await Promise.allSettled([request(),request()]);expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(sender.send).toHaveBeenCalledTimes(1)});
});
describe("OTP verification and POP account",()=>{
  it("creates only minimal user/plan/onboarding state and existing session",async()=>{await request();const result=await verify();expect(result).toMatchObject({ok:true,isNewAccount:true,needsOnboarding:true,accessToken:"access"});expect(users).toHaveLength(1);expect(users[0].name).toBeNull();expect(mocks.bootstrap).toHaveBeenCalledTimes(1);expect(mocks.issue.mock.calls[0][4]).toMatchObject({authMethod:"OTP"})});
  it("logs into existing canonical phone without duplicate or external identity",async()=>{users.push({id:"existing",phoneE164:phone,status:"ACTIVE",role:"USER"});await request();expect(await verify()).toMatchObject({isNewAccount:false,user:{id:"existing"}});expect(mocks.db.user.create).not.toHaveBeenCalled()});
  it("adopts a legacy canonical phone safely",async()=>{users.push({id:"legacy",phone,phoneE164:null,status:"ACTIVE",role:"USER"});await request();await verify();expect(users[0].phoneE164).toBe(phone);expect(users).toHaveLength(1)});
  it("commits wrong attempts and locks at maximum",async()=>{await request();const wrong=code==="000000"?"111111":"000000";for(let i=0;i<4;i++)await expect(verify(wrong)).rejects.toMatchObject({code:"OTP_INVALID"});await expect(verify(wrong)).rejects.toMatchObject({code:"OTP_ATTEMPTS_EXHAUSTED"});expect(rows[0].attempts).toBe(5);await expect(verify()).rejects.toMatchObject({code:"OTP_ATTEMPTS_EXHAUSTED"});expect(mocks.issue).not.toHaveBeenCalled()});
  it("rejects expiration",async()=>{await request();advance(300000);await expect(verify()).rejects.toMatchObject({code:"OTP_EXPIRED"})});
  it("binds the phone and challenge",async()=>{await request();await expect(verify(code,"+201001234568")).rejects.toMatchObject({code:"OTP_INVALID"});await expect(verify(code,phone,"a".repeat(36))).rejects.toMatchObject({code:"OTP_INVALID"});expect(rows[0].attempts).toBe(0)});
  it("consumes exactly once under concurrent verification",async()=>{await request();const results=await Promise.allSettled([verify(),verify(),verify()]);expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(users).toHaveLength(1);expect(mocks.issue).toHaveBeenCalledTimes(1);await expect(verify()).rejects.toMatchObject({code:"OTP_USED"})});
  it("rejects ambiguous legacy ownership and blocked users",async()=>{users.push({id:"blocked",phoneE164:phone,status:"SUSPENDED"});await request();await expect(verify()).rejects.toMatchObject({code:"OTP_ACCOUNT_UNAVAILABLE"});expect(mocks.issue).not.toHaveBeenCalled()});
  it("rolls back consumption and new user if platform plan is absent",async()=>{await request();mocks.db.plan.findUnique.mockResolvedValue(null);await expect(verify()).rejects.toMatchObject({code:"OTP_CONFIGURATION_UNAVAILABLE"});expect(users).toHaveLength(0);expect(rows[0].consumedAt).toBeNull()});
  it("resumes incomplete onboarding for a returning account",async()=>{users.push({id:"existing",phoneE164:phone,status:"ACTIVE",role:"USER"});mocks.db.onboardingProgress.findUnique.mockResolvedValue({data:{phaseCNewAccount:true,phaseCProfileBootstrapComplete:true},completedAt:null});await request();expect(await verify()).toMatchObject({needsOnboarding:true,nextAction:"PROFILE_SETUP"})});
});
describe("HTTP contracts",()=>{
  it("rejects malformed JSON with safe no-store response",async()=>{const response=await requestRoute(new Request("https://pop.example/api/mobile/auth/otp/request",{method:"POST",body:"{"}));expect(response.status).toBe(400);expect(response.headers.get("cache-control")).toBe("no-store");expect(await response.json()).toEqual({ok:false,error:"PHONE_INVALID"})});
  it("verify uses established session envelope and no-store",async()=>{await request();const response=await verifyRoute(new Request("https://pop.example/api/mobile/auth/otp/verify",{method:"POST",body:JSON.stringify({phone,challengeId:id,code})}));expect(response.status).toBe(200);expect(await response.json()).toMatchObject({ok:true,accessToken:"access",refreshToken:"refresh"});expect(response.headers.get("cache-control")).toBe("no-store")});
});
