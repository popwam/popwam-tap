import {existsSync,readdirSync} from "node:fs";
import {join} from "node:path";
import {describe,expect,it} from "vitest";

const appRoot=join(process.cwd(),"src","app");
const isDynamic=(name:string)=>name.startsWith("[")&&name.endsWith("]");
const slugName=(name:string)=>name.replace(/^\[\[?\.{0,3}/,"").replace(/\]\]?$/,"");

function dynamicSiblingConflicts(directory:string,found:string[]=[]):string[]{
  const children=readdirSync(directory,{withFileTypes:true}).filter(entry=>entry.isDirectory());
  const dynamicNames=new Set(children.filter(entry=>isDynamic(entry.name)).map(entry=>slugName(entry.name)));
  if(dynamicNames.size>1)found.push(`${directory}: ${[...dynamicNames].join(",")}`);
  for(const child of children)dynamicSiblingConflicts(join(directory,child.name),found);
  return found;
}

describe("Next.js App Router topology",()=>{
  it("has no differently named dynamic siblings at the same path depth",()=>{
    expect(dynamicSiblingConflicts(appRoot)).toEqual([]);
  });
  it("separates provider actions from connected-account actions",()=>{
    const integrations=join(appRoot,"api","integrations");
    expect(existsSync(join(integrations,"[provider]","connect","route.ts"))).toBe(true);
    expect(existsSync(join(integrations,"[provider]","callback","route.ts"))).toBe(true);
    expect(existsSync(join(integrations,"accounts","[id]","route.ts"))).toBe(true);
    expect(existsSync(join(integrations,"accounts","[id]","sync","route.ts"))).toBe(true);
    expect(existsSync(join(integrations,"accounts","[id]","importable-fields","route.ts"))).toBe(true);
    expect(existsSync(join(integrations,"[id]"))).toBe(false);
  });
});
