import {createHmac} from "node:crypto";
import {normalizePhone} from "./phone";
export function normalizedContactHash(phone:string,countryIso2:string){const normalized=normalizePhone(phone,countryIso2);if(!normalized.valid)return null;const pepper=process.env.CONTACT_MATCH_PEPPER;if(!pepper)throw new Error("CONTACT_MATCH_PEPPER_REQUIRED");return createHmac("sha256",pepper).update(normalized.e164).digest("base64url")}
