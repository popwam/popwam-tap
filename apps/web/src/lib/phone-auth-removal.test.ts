import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
function sources(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?sources(resolve(dir,e.name)):/\.(kt|ts|tsx)$/.test(e.name)?[resolve(dir,e.name)]:[])}
describe("phone authentication architecture",()=>{
  it("has no retired SDK symbols in Android production source",()=>{
    const forbidden=/\b(?:FirebaseAuth|PhoneAuthProvider|PhoneAuthCredential|verifyPhoneNumber|signInWithCredential)\b/;
    const files=sources(resolve("../android/app/src/main/java"));
    expect(files.filter(file=>forbidden.test(readFileSync(file,"utf8")))).toEqual([]);
    expect(readFileSync("../android/app/build.gradle.kts","utf8")).not.toMatch(/implementation\s*\(\s*["']com\.google\.firebase:firebase-auth/);
  });
  it("cannot restore the old exchange endpoint or its client header",()=>{
    expect(existsSync("src/app/api/mobile/auth/firebase/phone/exchange/route.ts")).toBe(false);
    expect(readFileSync("../android/app/src/main/java/com/popwam/pop/data/api/PopwamApi.kt","utf8")).not.toMatch(/X-Firebase-Id-Token/i);
    expect(readFileSync("../android/app/src/main/java/com/popwam/pop/MainActivity.kt","utf8")).toContain("PhoneLoginScreen(");
  });
  it("contains neither old auth presentations nor shared module source",()=>{
    expect(existsSync("../android/app/src/main/java/com/popwam/pop/ui/auth/AuthenticationHost.kt")).toBe(false);
    expect(readFileSync("../android/app/src/main/java/com/popwam/pop/ui/PopwamApp.kt","utf8")).not.toMatch(/LegacyServerOtpLoginScreen|PhoneOtpScreen|LoginScreen\(/);
  });
});
