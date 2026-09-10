import { PUBLIC_HOST } from "./domains";
import { isSafeDestinationUrl, normalizeDestination } from "./url";

export type StorefrontPolicy = { enabled:boolean; products:boolean; services:boolean; maxItems:number|null; whatsapp:boolean; email:boolean };
export const DISABLED_STOREFRONT_POLICY: StorefrontPolicy = {enabled:false,products:false,services:false,maxItems:0,whatsapp:false,email:false};

export function selectStorefrontItems<T extends {itemType:"PRODUCT"|"SERVICE";isVisible:boolean}>(items:T[],policy:StorefrontPolicy){if(!policy.enabled)return[];return items.filter(item=>item.isVisible&&(item.itemType==="PRODUCT"?policy.products:policy.services)).slice(0,policy.maxItems??undefined);}
export function storefrontContactChannels(policy:StorefrontPolicy,input:{contactPublic:boolean;whatsapp?:string|null;email?:string|null}){return{whatsapp:policy.enabled&&policy.whatsapp&&input.contactPublic?input.whatsapp||null:null,email:policy.enabled&&policy.email&&input.contactPublic?input.email||null:null};}

export function canonicalProfileUrl(slug?:string|null){return slug?`https://${PUBLIC_HOST}/p/${encodeURIComponent(slug)}`:`https://${PUBLIC_HOST}`;}
export type StorefrontEnquiry = {locale:"ar"|"en";businessName:string;itemName:string;profileUrl:string;price?:string|null};
export function storefrontMessage(input:StorefrontEnquiry){
  const price=input.price?`\n${input.price}`:"";
  return input.locale==="ar"?`مرحبًا ${input.businessName}\n\nأنا مهتم بـ:\n${input.itemName}${price}\n\n${input.profileUrl}`:`Hello ${input.businessName}\n\nI am interested in:\n${input.itemName}${price}\n\n${input.profileUrl}`;
}
export function whatsappOrderUrl(phone:string,message:string){const base=normalizeDestination("WHATSAPP_BUSINESS",phone);if(!isSafeDestinationUrl(base))return null;try{const url=new URL(base);url.searchParams.set("text",message);return isSafeDestinationUrl(url.toString())?url.toString():null;}catch{return null;}}
export function emailOrderUrl(email:string,input:StorefrontEnquiry){const destination=normalizeDestination("EMAIL",email);if(!isSafeDestinationUrl(destination))return null;const address=destination.slice("mailto:".length).split("?")[0];if(!address)return null;const subject=input.locale==="ar"?`استفسار عن ${input.itemName}`:`Enquiry about ${input.itemName}`;const body=storefrontMessage(input);return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;}
