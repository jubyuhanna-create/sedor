import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "session";

async function verify(token, secret) {
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/login") || pathname.startsWith("/api/login")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET;

  const valid = token && secret ? await verify(token, secret) : false;

  if (!valid) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
