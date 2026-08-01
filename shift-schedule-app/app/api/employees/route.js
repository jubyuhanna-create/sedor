import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseServer } from "../../../lib/supabase";
import { verifySessionToken, SESSION_COOKIE } from "../../../lib/auth";

async function getSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

// מיפוי תפקיד -> הרשאות בפועל. נקבע בצד השרת בלבד (לא סומכים על מה שנשלח מהלקוח).
const ROLE_MAP = {
  kitchen: { accessRole: "employee", allowedPositions: ["מטבח", "טאבון / שטיפה"] },
  bar: { accessRole: "employee", allowedPositions: ["בר"] },
  admin: { accessRole: "admin", allowedPositions: [] },
};

export async function POST(request) {
  const session = await getSession(request);
  if (!session || session.accessRole !== "admin") {
    return NextResponse.json({ error: "הפעולה מותרת למנהל בלבד" }, { status: 403 });
  }

  const { username, password, displayName, roleKey } = await request.json();

  if (!username || !password || !displayName || !roleKey) {
    return NextResponse.json({ error: "יש למלא את כל השדות" }, { status: 400 });
  }

  const roleConfig = ROLE_MAP[roleKey];
  if (!roleConfig) {
    return NextResponse.json({ error: "תפקיד לא תקין" }, { status: 400 });
  }

  if (password.length < 4) {
    return NextResponse.json({ error: "הסיסמה חייבת להכיל לפחות 4 תווים" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const { data: existing } = await supabase
    .from("employees")
    .select("id")
    .eq("username", username.trim())
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "שם המשתמש הזה כבר קיים" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("employees")
    .insert({
      username: username.trim(),
      password_hash: passwordHash,
      display_name: displayName.trim(),
      access_role: roleConfig.accessRole,
      allowed_positions: roleConfig.allowedPositions,
    })
    .select("id, username, display_name, access_role, allowed_positions")
    .single();

  if (error) {
    return NextResponse.json({ error: "יצירת המשתמש נכשלה" }, { status: 500 });
  }

  return NextResponse.json({ employee: data });
}
