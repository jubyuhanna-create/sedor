import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../lib/supabase";
import { verifySessionToken, SESSION_COOKIE } from "../../../lib/auth";
import { sendEmail, scheduleChangedEmail } from "../../../lib/email";

async function getSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

function canManagePosition(session, positionName) {
  if (session.accessRole === "admin") return true;
  return Array.isArray(session.allowedPositions) && session.allowedPositions.includes(positionName);
}

async function getWeekPublished(supabase, weekStart) {
  const { data } = await supabase
    .from("schedule_weeks")
    .select("is_published")
    .eq("week_start", weekStart)
    .maybeSingle();
  return !!data?.is_published;
}

// שולח מייל לעובד המושפע רק אם השבוע הזה כבר פורסם (שינוי אחרי פרסום, לא בזמן בניית הטיוטה).
async function notifyIfPublished(supabase, weekStart, staffId) {
  const isPublished = await getWeekPublished(supabase, weekStart);
  if (!isPublished) return;

  const { data: staffMember } = await supabase
    .from("staff_members")
    .select("name, email")
    .eq("id", staffId)
    .single();

  if (!staffMember?.email) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  await sendEmail({
    to: staffMember.email,
    subject: "עדכון במשמרת שלך — מסעדת רסיס",
    html: scheduleChangedEmail({ name: staffMember.name, link: `${siteUrl}/gate` }),
  });
}

export async function POST(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });

  const { weekStart, shiftName, positionName, dayName, staffId, shiftTime } = await request.json();
  if (!weekStart || !shiftName || !positionName || !dayName || !staffId || !shiftTime) {
    return NextResponse.json({ error: "חסרים נתונים" }, { status: 400 });
  }
  if (!canManagePosition(session, positionName)) {
    return NextResponse.json({ error: "אין לך הרשאה למחלקה הזו" }, { status: 403 });
  }

  const supabase = getSupabaseServer();

  if (session.accessRole === "admin" && (await getWeekPublished(supabase, weekStart))) {
    return NextResponse.json({ error: "הסידור פורסם, לא ניתן לערוך" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("schedule_assignments")
    .insert({
      week_start: weekStart,
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

  await notifyIfPublished(supabase, weekStart, staffId);

  return NextResponse.json({ assignment: data });
}

export async function DELETE(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "חסרים נתונים" }, { status: 400 });

  const supabase = getSupabaseServer();

  const { data: existing, error: fetchErr } = await supabase
    .from("schedule_assignments")
    .select("position_name, week_start, staff_id")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "השיבוץ לא נמצא" }, { status: 404 });
  }

  if (!canManagePosition(session, existing.position_name)) {
    return NextResponse.json({ error: "אין לך הרשאה למחלקה הזו" }, { status: 403 });
  }

  if (session.accessRole === "admin" && (await getWeekPublished(supabase, existing.week_start))) {
    return NextResponse.json({ error: "הסידור פורסם, לא ניתן לערוך" }, { status: 409 });
  }

  const { error } = await supabase.from("schedule_assignments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "המחיקה נכשלה" }, { status: 500 });

  await notifyIfPublished(supabase, existing.week_start, existing.staff_id);

  return NextResponse.json({ ok: true });
}
