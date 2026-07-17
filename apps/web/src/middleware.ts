import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {canonicalHostFor,hostWithoutPort} from "@/lib/domains";

export async function middleware(request: NextRequest) {
  const rawHost = request.headers.get("host") || "";
  const host = hostWithoutPort(rawHost);
  const path = request.nextUrl.pathname;
  const canonicalHost=canonicalHostFor(host,path);
  if(canonicalHost){
    const url = request.nextUrl.clone();
    url.hostname = canonicalHost;
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url);
  }

  // The route lives in a separate route group, outside the protected admin layout.
  if (path === "/admin/login") {
    return NextResponse.next();
  }

  if (path.startsWith("/dashboard") || path.startsWith("/admin")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = path.startsWith("/admin") ? "/admin/login" : "/login";
      url.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(url);
    }
  }

  // Authorization deliberately happens in server layouts against the current DB row.
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|brand/|templates/).*)"] };
