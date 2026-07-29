import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseServer } from "../../../lib/supabase";
import { createSessionToken, SESSION_COOKIE } from "../../../lib/auth";

export async function POST(request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "الرجاء إدخال اسم المستخدم وكلمة المرور" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const { data: employee, error } = await supabase
    .from("employees")
    .select("username, password_hash, display_name, access_role")
    .eq("username", username)
    .single();

  if (error || !employee) {
    return NextResponse.json({ error: "اسم مستخدم أو كلمة مرور غير صحيحة" }, { status: 401 });
  }

  const passwordMatches = await bcrypt.compare(password, employee.password_hash);
  if (!passwordMatches) {
    return NextResponse.json({ error: "اسم مستخدم أو كلمة مرور غير صحيحة" }, { status: 401 });
  }

  const token = await createSessionToken({
    username: employee.username,
    displayName: employee.display_name,
    accessRole: employee.access_role,
  });

  const response = NextResponse.json({
    ok: true,
    displayName: employee.display_name,
    accessRole: employee.access_role,
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
