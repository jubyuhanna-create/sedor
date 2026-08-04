import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../../lib/supabase";
import { verifySessionToken, SESSION_COOKIE } from "../../../../lib/auth";

async function getSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

function canManagePosition(session, positionName) {
  if (session.accessRole === "admin") return true;
  return Array.isArray(session.allowedPositions) && session.allowedPositions.includes(positionName);
}

// ברירת מחדל לשעת משמרת כשמיישמים בקשה — ניתן לעריכה ידנית אחרי מכן בטבלה הרגילה.
function defaultShiftTime(shiftName) {
  return shiftName === "משמרת בוקר" ? "08:00" : "17:00";
}

// POST — ממלא אוטומטית תאים ריקים במחלקה מסוימת, לפי בקשות "רוצה לעבוד" של העובדים.
export async function POST(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });

  const { weekStart, positionName } = await request.json();
  if (!weekStart || !positionName) {
    return NextResponse.json({ error: "חסרים נתונים" }, { status: 400 });
  }
  if (!canManagePosition(session, positionName)) {
    return NextResponse.json({ error: "אין לך הרשאה למחלקה הזו" }, { status: 403 });
  }

  const supabase = getSupabaseServer();

  const { data: weekRow } = await supabase
    .from("schedule_weeks")
    .select("is_published")
    .eq("week_start", weekStart)
    .maybeSingle();

  if (session.accessRole === "admin" && weekRow?.is_published) {
    return NextResponse.json({ error: "הסידור פורסם, לא ניתן לערוך" }, { status: 409 });
  }

  const [{ data: requests, error: reqErr }, { data: existing, error: existErr }] = await Promise.all([
    supabase
      .from("shift_requests")
      .select("day_name, shift_name, staff_id, staff_members(position_name)")
      .eq("week_start", weekStart)
      .eq("wants_to_work", true),
    supabase
      .from("schedule_assignments")
      .select("day_name, shift_name, position_name, staff_id")
      .eq("week_start", weekStart),
  ]);

  if (reqErr || existErr) {
    return NextResponse.json({ error: "טעינת הנתונים נכשלה" }, { status: 500 });
  }

  // תאים תפוסים במחלקה הזו (לא לדרוס), וסטאף שכבר משובץ בכל מקום אחר באותו יום/משמרת (למנוע התנגשות)
  const filledCellsInPosition = new Set(
    (existing || [])
      .filter((a) => a.position_name === positionName)
      .map((a) => `${a.day_name}|${a.shift_name}|${a.staff_id}`)
  );
  const busyElsewhere = new Set(
    (existing || []).map((a) => `${a.day_name}|${a.shift_name}|${a.staff_id}`)
  );

  const positionRequests = (requests || []).filter(
    (r) => r.staff_members?.position_name === positionName
  );

  const toInsert = [];
  const conflicts = [];
  const seen = new Set();

  for (const r of positionRequests) {
    const cellKey = `${r.day_name}|${r.shift_name}|${r.staff_id}`;
    if (filledCellsInPosition.has(cellKey) || seen.has(cellKey)) continue; // כבר קיים בדיוק שם
    if (busyElsewhere.has(cellKey)) {
      conflicts.push({ dayName: r.day_name, shiftName: r.shift_name, staffId: r.staff_id });
      continue;
    }
    seen.add(cellKey);
    toInsert.push({
      week_start: weekStart,
      shift_name: r.shift_name,
      position_name: positionName,
      day_name: r.day_name,
      staff_id: r.staff_id,
      shift_time: defaultShiftTime(r.shift_name),
    });
  }

  let insertedCount = 0;
  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from("schedule_assignments").insert(toInsert);
    if (insertErr) {
      return NextResponse.json({ error: "יישום ההצעה נכשל" }, { status: 500 });
    }
    insertedCount = toInsert.length;
  }

  return NextResponse.json({
    ok: true,
    insertedCount,
    conflictsCount: conflicts.length,
  });
}
