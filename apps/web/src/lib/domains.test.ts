import {describe,expect,it} from "vitest";
import {canonicalHostFor,isAppPath,isPublicPath,rootExperience} from "./domains";
describe("two-domain routing",()=>{
  it("keeps application routes on the app host",()=>{expect(isAppPath("/dashboard")).toBe(true);expect(canonicalHostFor("go.popwam.com","/login")).toBe("pop.popwam.com");});
  it("keeps public cards and files on the public host",()=>{expect(isPublicPath("/card-42")).toBe(true);expect(canonicalHostFor("pop.popwam.com","/file/work")).toBe("go.popwam.com");});
  it("serves the store only at the public root",()=>{expect(rootExperience("go.popwam.com")).toBe("store");expect(rootExperience("pop.popwam.com")).toBe("app");});
  it("redirects legacy hosts without inventing a third host",()=>{expect(canonicalHostFor("app.popwam.com","/dashboard")).toBe("pop.popwam.com");expect(canonicalHostFor("tap.popwam.com","/old-card")).toBe("go.popwam.com");});
});
