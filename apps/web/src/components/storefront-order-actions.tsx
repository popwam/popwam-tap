import { Mail, MessageCircle } from "lucide-react";
import { emailOrderUrl, storefrontMessage, whatsappOrderUrl } from "@/lib/storefront-order";

export function StorefrontOrderActions({locale,businessName,itemName,profileUrl,price,whatsapp,email}:{locale:"ar"|"en";businessName:string;itemName:string;profileUrl:string;price?:string|null;whatsapp?:string|null;email?:string|null}){
  const message=storefrontMessage({locale,businessName,itemName,profileUrl,price});const wa=whatsapp?whatsappOrderUrl(whatsapp,message):null;const mail=email?emailOrderUrl(email,{locale,businessName,itemName,profileUrl,price}):null;if(!wa&&!mail)return null;
  return <div className="storefront-order-actions mt-4 flex flex-wrap gap-2">{wa&&<a className="profile-button inline-flex flex-1 items-center justify-center gap-2 text-xs" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={15}/>{locale==="ar"?"اطلب عبر واتساب":"Enquire on WhatsApp"}</a>}{mail&&<a className="profile-item inline-flex flex-1 items-center justify-center gap-2 rounded-[var(--item-radius)] px-3 py-2 text-xs font-bold" href={mail}><Mail size={15}/>{locale==="ar"?"استفسر بالبريد":"Enquire by email"}</a>}</div>;
}
