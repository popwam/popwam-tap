import {describe,expect,it} from "vitest";
import {parseSmsMisrResponse,smsMisrTransportFailure,SMSMISR_CODES,toSmsMisrMobile} from "./smsmisr";

describe("SMS Misr OTP provider responses",()=>{
  it("accepts only 4901 and captures non-secret observability",()=>expect(parseSmsMisrResponse({code:"4901",SMSID:"12345",Cost:"1"})).toEqual({status:"SENT",provider:"smsmisr",responseCode:"4901",messageId:"12345",cost:"1"}));
  for(const code of ["4903","4904","4905","4906","4907","4908","4909","4912"])it(`rejects ${code} (${SMSMISR_CODES[code]})`,()=>expect(parseSmsMisrResponse({code})).toMatchObject({status:"FAILED",provider:"smsmisr",responseCode:code,error:"PROVIDER_REJECTED"}));
  it("rejects malformed responses",()=>{expect(parseSmsMisrResponse(null)).toMatchObject({status:"FAILED",error:"INVALID_RESPONSE"});expect(parseSmsMisrResponse({ok:true})).toMatchObject({status:"FAILED",error:"INVALID_RESPONSE"});});
  it("classifies timeout without leaking request data",()=>{const error=new Error("request timed out");error.name="TimeoutError";expect(smsMisrTransportFailure(error)).toEqual({status:"FAILED",provider:"smsmisr",error:"TIMEOUT"});});
  it("converts Egyptian E.164 to the provider format",()=>{expect(toSmsMisrMobile("+201012345678")).toBe("201012345678");expect(()=>toSmsMisrMobile("+37360000000")).toThrow("SMSMISR_MOBILE_INVALID");});
});
