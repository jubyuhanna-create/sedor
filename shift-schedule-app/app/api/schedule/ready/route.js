import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../../lib/supabase";
import { verifySessionToken, SESSION_COOKIE } from "../../../../lib/auth";
import { getCurrentWeekStartKey, getNextWeekStartKey } from "../../../../lib/weeks";

async function getSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

function canManagePosition(session, positionName) {
  if (session.accessRole === "admin") return true;
  return Array.isArray(session.allowedPositions) && session.allowedPositions.includes(positionName);
}

// POST — סימון/ביטול "מוכן" למחלקה מסוימת, ע"י מי שמורשה לנהל אותה בלבד.
export async function POST(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });

  const { weekStart, positionName, ready } = await request.json();
  const currentWeekStart = getCurrentWeekStartKey();
  const nextWeekStart = getNextWeekStartKey();

  if (weekStart !== currentWeekStart && weekStart !== nextWeekStart) {
    return NextResponse.json({ error: "שבוע לא תקין" }, { status: 400 });
  }
  if (!canManagePosition(session, positionName)) {
    return NextResponse.json({ error: "אין לך הרשאה למחלקה הזו" }, { status: 403 });
  }

  const supabase = getSupabaseServer();

  const { data: weekRow } = await supabase
    .from("schedule_weeks")
    .select("ready_positions")
    .eq("week_start", weekStart)
    .maybeSingle();

  const current = new Set(weekRow?.ready_positions || []);
  if (ready) {
    current.add(positionName);
  } else {
    current.delete(positionName);
  }

  const { error } = await supabase.from("schedule_weeks").upsert({
    week_start: weekStart,
    ready_positions: Array.from(current),
  });

  if (error) return NextResponse.json({ error: "העדכון נכשל" }, { status: 500 });

  return NextResponse.json({ ok: true, readyPositions: Array.from(current) });
}
