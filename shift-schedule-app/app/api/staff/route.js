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

  const { name, positionName } = await request.json();
  if (!name || !positionName) {
    return NextResponse.json({ error: "חסרים נתונים" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("staff_members")
    .insert({ name: name.trim(), position_name: positionName })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "ההוספה נכשלה" }, { status: 500 });
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
