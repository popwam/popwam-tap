export const APP_HOST = process.env.APP_HOST || "pop.popwam.com";
export const PUBLIC_HOST = process.env.PUBLIC_HOST || "go.popwam.com";
export const LEGACY_APP_HOST = "app.popwam.com";
export const LEGACY_TAP_HOST = "tap.popwam.com";

const APP_PREFIXES=["/login","/activate","/dashboard","/admin","/api","/health","/download"];
const PUBLIC_PREFIXES=["/profile/","/file/","/product/","/p/","/t/"];
const RESERVED_ROOTS=new Set(["login","activate","dashboard","admin","api","health","download","privacy","terms","offline"]);
export const hostWithoutPort=(value:string)=>value.toLowerCase().split(":")[0];
export const rootExperience=(host:string)=>hostWithoutPort(host)===PUBLIC_HOST?"store":"app";
export const isAppPath=(path:string)=>APP_PREFIXES.some(prefix=>path===prefix||path.startsWith(`${prefix}/`));
export const isPublicPath=(path:string)=>PUBLIC_PREFIXES.some(prefix=>path.startsWith(prefix))||(/^\/[a-z0-9][a-z0-9_-]{1,63}\/?$/i.test(path)&&!RESERVED_ROOTS.has(path.split("/")[1].toLowerCase()));

export function canonicalHostFor(host:string,path:string){
  const current=hostWithoutPort(host);
  if(current===LEGACY_APP_HOST)return APP_HOST;
  if(current===LEGACY_TAP_HOST)return isAppPath(path)?APP_HOST:PUBLIC_HOST;
  if(current===PUBLIC_HOST&&isAppPath(path))return APP_HOST;
  if(current===APP_HOST&&isPublicPath(path))return PUBLIC_HOST;
  return null;
}
