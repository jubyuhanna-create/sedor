import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../lib/supabase";
import { createSessionToken, SESSION_COOKIE } from "../../../lib/auth";

export async function POST(request) {
  const { pin } = await request.json();
  if (!pin) {
    return NextResponse.json({ error: "الرجاء إدخال الرمز" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data: status, error } = await supabase
    .from("schedule_status")
    .select("view_pin")
    .eq("id", 1)
    .single();

  if (error || !status) {
    return NextResponse.json({ error: "تعذر التحقق من الرمز" }, { status: 500 });
  }

  if (pin !== status.view_pin) {
    return NextResponse.json({ error: "الرمز غير صحيح" }, { status: 401 });
  }

  const token = await createSessionToken({
    username: "viewer",
    displayName: "צוות",
    accessRole: "employee",
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
