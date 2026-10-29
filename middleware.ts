import { NextResponse, type NextRequest } from "next/server";
import { isRequestAuthorized, isValidSession, SESSION_COOKIE } from "@/lib/auth";

const API_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return new NextResponse(null, { status: 204, headers: API_CORS });
  }

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = await isValidSession(cookie);

  if (pathname === "/login") {
    if (signedIn) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }
  if (pathname === "/api/login") return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    if (await isRequestAuthorized(cookie, request.headers.get("authorization"))) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: API_CORS });
  }
  if (signedIn) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest).*)"],
};
