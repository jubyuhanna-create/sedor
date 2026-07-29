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
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const supabase = getSupabaseServer();

  const [{ data: entries, error: entriesError }, { data: status, error: statusError }] =
    await Promise.all([
      supabase.from("schedule_entries").select("*"),
      supabase.from("schedule_status").select("*").eq("id", 1).single(),
    ]);

  if (entriesError || statusError) {
    return NextResponse.json({ error: "تعذر تحميل البيانات" }, { status: 500 });
  }

  return NextResponse.json({
    entries,
    isPublished: status?.is_published ?? false,
    session,
  });
}

// تحديث خانة واحدة (فقط للمدير، وفقط إذا الجدول مو منشور)
export async function PUT(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (session.accessRole !== "admin") {
    return NextResponse.json({ error: "هذا الإجراء للمدير فقط" }, { status: 403 });
  }

  const supabase = getSupabaseServer();

  const { data: status } = await supabase.from("schedule_status").select("is_published").eq("id", 1).single();
  if (status?.is_published) {
    return NextResponse.json({ error: "الجدول منشور، لا يمكن التعديل" }, { status: 409 });
  }

  const { shiftName, positionName, dayName, employeeName } = await request.json();
  if (!shiftName || !positionName || !dayName) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const { error } = await supabase
    .from("schedule_entries")
    .upsert(
      {
        shift_name: shiftName,
        position_name: positionName,
        day_name: dayName,
        employee_name: employeeName ?? "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shift_name,position_name,day_name" }
    );

  if (error) return NextResponse.json({ error: "تعذر الحفظ" }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// نشر / إلغاء نشر الجدول (فقط للمدير)
export async function POST(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (session.accessRole !== "admin") {
    return NextResponse.json({ error: "هذا الإجراء للمدير فقط" }, { status: 403 });
  }

  const { publish } = await request.json();
  const supabase = getSupabaseServer();

  const { error } = await supabase
    .from("schedule_status")
    .update({
      is_published: !!publish,
      published_at: publish ? new Date().toISOString() : null,
    })
    .eq("id", 1);

  if (error) return NextResponse.json({ error: "تعذر التحديث" }, { status: 500 });

  return NextResponse.json({ ok: true, isPublished: !!publish });
}
