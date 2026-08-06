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

// נתיבים ציבוריים שלא דורשים session בכלל — כל אחד מהם דואג להרשאה שלו בעצמו
// (או שאין צורך בהרשאה כלל, כמו קישור בקשת המשמרות האישי או ה-Cron).
const PUBLIC_PREFIXES = [
  "/login",
  "/api/login",
  "/gate",
  "/api/gate-login",
  "/request",       // עמוד בקשת המשמרות הציבורי (מזוהה ע"י token, לא session)
  "/api/requests",  // גם הגרסה עם ה-token וגם הגרסה עם session-check פנימי
  "/api/cron",      // נקרא ע"י Vercel Cron בלבד, מזוהה ע"י CRON_SECRET
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET;
  const valid = token && secret ? await verify(token, secret) : false;

  if (!valid) {
    const gateUrl = new URL("/gate", request.url);
    return NextResponse.redirect(gateUrl);
  }

  return NextResponse.next();
}

export const config = {
  // מוציאים גם קבצים סטטיים (תמונות, מניפסט, אייקונים) מהבדיקה —
  // כדי שדפדפן שמנסה לטעון /logo.png מדף לא מחובר לא יקבל redirect שיישבור את התמונה.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest|json)$).*)",
  ],
};
