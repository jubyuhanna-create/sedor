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

// הופך access_role + allowed_positions בחזרה לתווית תפקיד קריאה
function roleLabel(accessRole, allowedPositions) {
  if (accessRole === "admin") return "מנהל";
  const positions = allowedPositions || [];
  if (positions.includes("מטבח")) return "אחראי מטבח";
  if (positions.includes("בר")) return "אחראי בר";
  return "עובד";
}

export async function GET(request) {
  const session = await getSession(request);
  if (!session || session.accessRole !== "admin") {
    return NextResponse.json({ error: "הפעולה מותרת למנהל בלבד" }, { status: 403 });
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("employees")
    .select("id, username, display_name, access_role, allowed_positions, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "טעינת החשבונות נכשלה" }, { status: 500 });
  }

  const employees = data.map((e) => ({
    ...e,
    role_label: roleLabel(e.access_role, e.allowed_positions),
  }));

  return NextResponse.json({ employees });
}

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

export async function DELETE(request) {
  const session = await getSession(request);
  if (!session || session.accessRole !== "admin") {
    return NextResponse.json({ error: "הפעולה מותרת למנהל בלבד" }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "חסרים נתונים" }, { status: 400 });

  const supabase = getSupabaseServer();

  const { data: target, error: fetchErr } = await supabase
    .from("employees")
    .select("username")
    .eq("id", id)
    .single();

  if (fetchErr || !target) {
    return NextResponse.json({ error: "החשבון לא נמצא" }, { status: 404 });
  }

  // מניעת מחיקה עצמית — כדי שמנהל לא ינעל את עצמו בטעות
  if (target.username === session.username) {
    return NextResponse.json({ error: "אי אפשר למחוק את החשבון שאיתו אתה מחובר כרגע" }, { status: 400 });
  }

  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "המחיקה נכשלה" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
