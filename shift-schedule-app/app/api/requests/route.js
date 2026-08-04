import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../lib/supabase";
import { verifySessionToken, SESSION_COOKIE } from "../../../lib/auth";
import { getNextWeekStartKey } from "../../../lib/weeks";

async function getSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

// GET — כל בקשות העובدים לשבוع הבא, מסונן לפי מה שהמשתמש המחובר מורשה לראות.
export async function GET(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });

  const isAdmin = session.accessRole === "admin";
  const allowedPositions = session.allowedPositions || [];

  if (!isAdmin && allowedPositions.length === 0) {
    return NextResponse.json({ error: "אין לך הרשאה לצפות בבקשות" }, { status: 403 });
  }

  const supabase = getSupabaseServer();
  const weekStart = getNextWeekStartKey();

  const { data, error } = await supabase
    .from("shift_requests")
    .select("id, day_name, shift_name, wants_to_work, note, staff_members(name, position_name)")
    .eq("week_start", weekStart);

  if (error) {
    return NextResponse.json({ error: "טעינת הבקשות נכשלה" }, { status: 500 });
  }

  const filtered = (data || []).filter((r) => {
    const position = r.staff_members?.position_name;
    if (isAdmin) return true;
    return allowedPositions.includes(position);
  });

  return NextResponse.json({ weekStart, requests: filtered });
}
