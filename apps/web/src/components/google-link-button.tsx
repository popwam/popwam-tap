"use client";
import {signIn} from "next-auth/react";
export function GoogleLinkButton({locale}:{locale:"ar"|"en"}){return <button type="button" className="btn-secondary" onClick={()=>signIn("google",{callbackUrl:"/dashboard/settings?google=linked"})}>{locale==="ar"?"ربط حساب Google بشكل صريح":"Explicitly link Google account"}</button>}
