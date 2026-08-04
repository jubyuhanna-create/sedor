import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../../lib/supabase";
import { DAYS, getNextWeekStartKey, getWeekDateLabels } from "../../../../lib/weeks";

const SHIFTS = ["משמרת בוקר", "משמרת ערב"];

// GET — טוען את פרטי העובד + הבקשות שהוא כבר שלח (אם בכלל) לשבוע הבא.
// אין צורך בהתחברות — הגישה מבוססת על ה-token האישי בלבד.
export async function GET(request, { params }) {
  const { token } = params;
  const supabase = getSupabaseServer();

  const { data: staffMember, error: staffErr } = await supabase
    .from("staff_members")
    .select("id, name, position_name")
    .eq("request_token", token)
    .single();

  if (staffErr || !staffMember) {
    return NextResponse.json({ error: "הקישור לא תקין" }, { status: 404 });
  }

  const weekStart = getNextWeekStartKey();

  const { data: existing, error: reqErr } = await supabase
    .from("shift_requests")
    .select("shift_name, day_name, wants_to_work, note")
    .eq("staff_id", staffMember.id)
    .eq("week_start", weekStart);

  if (reqErr) {
    return NextResponse.json({ error: "טעינת הבקשות נכשלה" }, { status: 500 });
  }

  return NextResponse.json({
    staffName: staffMember.name,
    positionName: staffMember.position_name,
    weekStart,
    weekDateLabels: getWeekDateLabels(weekStart),
    days: DAYS,
    shifts: SHIFTS,
    existingRequests: existing || [],
  });
}

// POST — שמירת/עדכון הבקשות של העובד לשבוע הבא.
export async function POST(request, { params }) {
  const { token } = params;
  const { requests } = await request.json();

  if (!Array.isArray(requests)) {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const { data: staffMember, error: staffErr } = await supabase
    .from("staff_members")
    .select("id")
    .eq("request_token", token)
    .single();

  if (staffErr || !staffMember) {
    return NextResponse.json({ error: "הקישור לא תקין" }, { status: 404 });
  }

  const weekStart = getNextWeekStartKey();

  const rows = requests
    .filter((r) => DAYS.includes(r.dayName) && SHIFTS.includes(r.shiftName))
    .map((r) => ({
      week_start: weekStart,
      staff_id: staffMember.id,
      shift_name: r.shiftName,
      day_name: r.dayName,
      wants_to_work: !!r.wantsToWork,
      note: r.note ? String(r.note).slice(0, 200) : null,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "אין נתונים לשמירה" }, { status: 400 });
  }

  const { error } = await supabase
    .from("shift_requests")
    .upsert(rows, { onConflict: "week_start,staff_id,shift_name,day_name" });

  if (error) {
    return NextResponse.json({ error: "השמירה נכשלה" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
