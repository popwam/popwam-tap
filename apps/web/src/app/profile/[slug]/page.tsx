import {redirect} from "next/navigation";export default async function CanonicalProfile({params}:{params:Promise<{slug:string}>}){redirect(`/p/${encodeURIComponent((await params).slug)}`)}
