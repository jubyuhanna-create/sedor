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

  const [
    { data: assignments, error: aErr },
    { data: staff, error: sErr },
    { data: status, error: stErr },
  ] = await Promise.all([
    supabase
      .from("schedule_assignments")
      .select("id, shift_name, position_name, day_name, staff_id, staff_members(name)"),
    supabase.from("staff_members").select("*").order("name"),
    supabase.from("schedule_status").select("*").eq("id", 1).single(),
  ]);

  if (aErr || sErr || stErr) {
    return NextResponse.json({ error: "تعذر تحميل البيانات" }, { status: 500 });
  }

  return NextResponse.json({
    assignments,
    staff,
    isPublished: status?.is_published ?? false,
    viewPin: session.accessRole === "admin" ? status?.view_pin : undefined,
    session,
  });
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

// تغيير رمز الدخول المكوّن من 4 أرقام (فقط للمدير)
export async function PATCH(request) {
  const session = await getSession(request);
  if (!session || session.accessRole !== "admin") {
    return NextResponse.json({ error: "هذا الإجراء للمدير فقط" }, { status: 403 });
  }

  const { viewPin } = await request.json();
  if (!viewPin || !/^\d{4}$/.test(viewPin)) {
    return NextResponse.json({ error: "الرمز يجب أن يكون 4 أرقام" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { error } = await supabase.from("schedule_status").update({ view_pin: viewPin }).eq("id", 1);

  if (error) return NextResponse.json({ error: "تعذر التحديث" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
