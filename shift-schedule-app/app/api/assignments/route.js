import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../lib/supabase";
import { verifySessionToken, SESSION_COOKIE } from "../../../lib/auth";

async function getSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

async function isEditable(supabase) {
  const { data: status } = await supabase
    .from("schedule_status")
    .select("is_published")
    .eq("id", 1)
    .single();
  return !status?.is_published;
}

function canManagePosition(session, positionName) {
  if (session.accessRole === "admin") return true;
  return Array.isArray(session.allowedPositions) && session.allowedPositions.includes(positionName);
}

export async function POST(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });

  const supabase = getSupabaseServer();
  if (!(await isEditable(supabase))) {
    return NextResponse.json({ error: "הסידור פורסם, לא ניתן לערוך" }, { status: 409 });
  }

  const { shiftName, positionName, dayName, staffId, shiftTime } = await request.json();
  if (!shiftName || !positionName || !dayName || !staffId || !shiftTime) {
    return NextResponse.json({ error: "חסרים נתונים" }, { status: 400 });
  }

  if (!canManagePosition(session, positionName)) {
    return NextResponse.json({ error: "אין לך הרשאה למחלקה הזו" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("schedule_assignments")
    .insert({
      shift_name: shiftName,
      position_name: positionName,
      day_name: dayName,
      staff_id: staffId,
      shift_time: shiftTime,
    })
    .select("id, staff_id, shift_time, staff_members(name)")
    .single();

  if (error) {
    return NextResponse.json({ error: "העובד כבר משובץ בתא הזה" }, { status: 409 });
  }
  return NextResponse.json({ assignment: data });
}

export async function DELETE(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });

  const supabase = getSupabaseServer();
  if (!(await isEditable(supabase))) {
    return NextResponse.json({ error: "הסידור פורסם, לא ניתן לערוך" }, { status: 409 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "חסרים נתונים" }, { status: 400 });

  const { data: existing, error: fetchErr } = await supabase
    .from("schedule_assignments")
    .select("position_name")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "השיבוץ לא נמצא" }, { status: 404 });
  }

  if (!canManagePosition(session, existing.position_name)) {
    return NextResponse.json({ error: "אין לך הרשאה למחלקה הזו" }, { status: 403 });
  }

  const { error } = await supabase.from("schedule_assignments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "המחיקה נכשלה" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
