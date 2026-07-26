import {csrfRejected,isSameOriginMutation} from "@/lib/api-auth";
import {createPasskeyAuthenticationOptions} from "@/lib/passkey-authentication";

export async function POST(request:Request){if(!isSameOriginMutation(request))return csrfRejected();const options=await createPasskeyAuthenticationOptions("WEB");return Response.json(options,{headers:{"cache-control":"no-store"}})}
