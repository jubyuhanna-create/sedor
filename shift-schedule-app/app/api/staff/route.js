import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../lib/supabase";
import { verifySessionToken, SESSION_COOKIE } from "../../../lib/auth";

async function getSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

export async function GET(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });

  const supabase = getSupabaseServer();
  const { data, error } = await supabase.from("staff_members").select("*").order("name");

  if (error) return NextResponse.json({ error: "טעינת העובדים נכשלה" }, { status: 500 });
  return NextResponse.json({ staff: data });
}

export async function POST(request) {
  const session = await getSession(request);
  if (!session || session.accessRole !== "admin") {
    return NextResponse.json({ error: "הפעולה מותרת למנהל בלבד" }, { status: 403 });
  }

  const { name, positionName, email } = await request.json();
  if (!name || !positionName) {
    return NextResponse.json({ error: "חסרים נתונים" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("staff_members")
    .insert({
      name: name.trim(),
      position_name: positionName,
      email: email ? email.trim() : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "ההוספה נכשלה" }, { status: 500 });
  return NextResponse.json({ staff: data });
}

// PATCH — עדכון האימייל של עובד קיים (בשלב זה רק האימייל ניתן לעדכון).
export async function PATCH(request) {
  const session = await getSession(request);
  if (!session || session.accessRole !== "admin") {
    return NextResponse.json({ error: "הפעולה מותרת למנהל בלבד" }, { status: 403 });
  }

  const { id, email } = await request.json();
  if (!id) return NextResponse.json({ error: "חסרים נתונים" }, { status: 400 });

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "כתובת אימייל לא תקינה" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("staff_members")
    .update({ email: email ? email.trim() : null })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "העדכון נכשל" }, { status: 500 });
  return NextResponse.json({ staff: data });
}

export async function DELETE(request) {
  const session = await getSession(request);
  if (!session || session.accessRole !== "admin") {
    return NextResponse.json({ error: "הפעולה מותרת למנהל בלבד" }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "חסרים נתונים" }, { status: 400 });

  const supabase = getSupabaseServer();
  const { error } = await supabase.from("staff_members").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "המחיקה נכשלה" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
