import { describe,it,expect,vi } from "vitest";
vi.mock("server-only",()=>({}));
import { resolveInitialTemplate } from "./profile-bootstrap-template";
const db=(selected:unknown=null)=>({profileTemplate:{findUnique:vi.fn(async()=>selected),upsert:vi.fn(async({create}:any)=>({id:create.slug,...create,isActive:true}))}});
describe("PASS 7 appearance-independent creation",()=>{
  it.each([["PERSONAL","personal-sunrise"],["BUSINESS","business-horizon"]] as const)("assigns the canonical %s fallback",async(kind,slug)=>{const tx=db();expect((await resolveInitialTemplate(tx as any,kind,null,"business"))?.slug).toBe(slug);expect(tx.profileTemplate.findUnique).not.toHaveBeenCalled()});
  it.each([null,{id:"invalid",slug:"retired",isActive:true,profileKind:"PERSONAL",minimumPlan:"free"},{id:"inactive",slug:"personal-sunrise",isActive:false,profileKind:"PERSONAL",minimumPlan:"free"},{id:"wrong",slug:"business-horizon",isActive:true,profileKind:"BUSINESS",minimumPlan:"business"},{id:"locked",slug:"professional-noir",isActive:true,profileKind:"PERSONAL",minimumPlan:"personal"}])("falls back safely for invalid inactive incompatible or locked selection %j",async selected=>{const tx=db(selected);expect((await resolveInitialTemplate(tx as any,"PERSONAL","bad","free"))?.slug).toBe("personal-sunrise")});
  it("keeps an active eligible selection",async()=>{const selected={id:"rose",slug:"personal-rose-paper",isActive:true,profileKind:"PERSONAL",minimumPlan:"free"};const tx=db(selected);expect(await resolveInitialTemplate(tx as any,"PERSONAL","rose","free")).toBe(selected);expect(tx.profileTemplate.upsert).not.toHaveBeenCalled()});
  it("preserves Admin deactivation and permits renderer fallback",async()=>{const tx=db();tx.profileTemplate.upsert.mockResolvedValue({id:"default",isActive:false} as any);expect(await resolveInitialTemplate(tx as any,"PERSONAL",null,"free")).toBeNull()});
});
