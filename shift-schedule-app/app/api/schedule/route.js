import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../lib/supabase";
import { verifySessionToken, SESSION_COOKIE } from "../../../lib/auth";
import { getCurrentWeekStartKey, getNextWeekStartKey } from "../../../lib/weeks";
import { sendEmail, schedulePublishedEmail } from "../../../lib/email";

async function getSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

export async function GET(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });

  const supabase = getSupabaseServer();
  const currentWeekStart = getCurrentWeekStartKey();
  const nextWeekStart = getNextWeekStartKey();

  const [
    { data: assignments, error: aErr },
    { data: staff, error: sErr },
    { data: weeks, error: wErr },
    { data: pinRow, error: pErr },
  ] = await Promise.all([
    supabase
      .from("schedule_assignments")
      .select("id, week_start, shift_name, position_name, day_name, staff_id, shift_time, staff_members(name)")
      .in("week_start", [currentWeekStart, nextWeekStart]),
    supabase.from("staff_members").select("*").order("name"),
    supabase.from("schedule_weeks").select("*").in("week_start", [currentWeekStart, nextWeekStart]),
    supabase.from("schedule_status").select("view_pin").eq("id", 1).single(),
  ]);

  if (aErr || sErr || wErr || pErr) {
    return NextResponse.json({ error: "לא ניתן לטעון את הנתונים" }, { status: 500 });
  }

  function findPublished(weekStart) {
    return (weeks || []).find((w) => w.week_start === weekStart)?.is_published ?? false;
  }

  function findReadyPositions(weekStart) {
    return (weeks || []).find((w) => w.week_start === weekStart)?.ready_positions ?? [];
  }

  return NextResponse.json({
    session,
    staff,
    viewPin: session.accessRole === "admin" ? pinRow?.view_pin : undefined,
    weeks: {
      current: {
        weekStart: currentWeekStart,
        isPublished: findPublished(currentWeekStart),
        readyPositions: findReadyPositions(currentWeekStart),
        assignments: (assignments || []).filter((a) => a.week_start === currentWeekStart),
      },
      next: {
        weekStart: nextWeekStart,
        isPublished: findPublished(nextWeekStart),
        readyPositions: findReadyPositions(nextWeekStart),
        assignments: (assignments || []).filter((a) => a.week_start === nextWeekStart),
      },
    },
  });
}

export async function POST(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  if (session.accessRole !== "admin") {
    return NextResponse.json({ error: "פעולה זו מיועדת למנהל בלבד" }, { status: 403 });
  }

  const { weekStart, publish } = await request.json();
  const currentWeekStart = getCurrentWeekStartKey();
  const nextWeekStart = getNextWeekStartKey();
  if (weekStart !== currentWeekStart && weekStart !== nextWeekStart) {
    return NextResponse.json({ error: "שבוע לא תקין" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const { data: existingWeek } = await supabase
    .from("schedule_weeks")
    .select("is_published")
    .eq("week_start", weekStart)
    .maybeSingle();

  const wasPublished = !!existingWeek?.is_published;

  const { error } = await supabase.from("schedule_weeks").upsert({
    week_start: weekStart,
    is_published: !!publish,
    published_at: publish ? new Date().toISOString() : null,
  });
  if (error) return NextResponse.json({ error: "העדכון נכשל" }, { status: 500 });

  // שולחים מייל לכל הצוות רק במעבר בפועל מטיוטה לפרסום — לא בכל לחיצה חוזרת.
  if (publish && !wasPublished) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    const { data: staff } = await supabase
      .from("staff_members")
      .select("name, email")
      .not("email", "is", null);

    for (const s of staff || []) {
      await sendEmail({
        to: s.email,
        subject: "הסידור פורסם — מסעדת רסיס",
        html: schedulePublishedEmail({ name: s.name, link: `${siteUrl}/gate` }),
      });
    }
  }

  return NextResponse.json({ ok: true, weekStart, isPublished: !!publish });
}

export async function PATCH(request) {
  const session = await getSession(request);
  if (!session || session.accessRole !== "admin") {
    return NextResponse.json({ error: "פעולה זו מיועדת למנהל בלבד" }, { status: 403 });
  }
  const { viewPin } = await request.json();
  if (!viewPin || !/^\d{4}$/.test(viewPin)) {
    return NextResponse.json({ error: "הקוד חייב להיות 4 ספרות" }, { status: 400 });
  }
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("schedule_status").update({ view_pin: viewPin }).eq("id", 1);
  if (error) return NextResponse.json({ error: "העדכון נכשל" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
