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

export async function POST(request) {
  const session = await getSession(request);
  if (!session || session.accessRole !== "admin") {
    return NextResponse.json({ error: "هذا الإجراء للمدير فقط" }, { status: 403 });
  }

  const supabase = getSupabaseServer();
  if (!(await isEditable(supabase))) {
    return NextResponse.json({ error: "الجدول منشور، لا يمكن التعديل" }, { status: 409 });
  }

  const { shiftName, positionName, dayName, staffId } = await request.json();
  if (!shiftName || !positionName || !dayName || !staffId) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("schedule_assignments")
    .insert({
      shift_name: shiftName,
      position_name: positionName,
      day_name: dayName,
      staff_id: staffId,
    })
    .select("id, staff_id, staff_members(name)")
    .single();

  if (error) {
    return NextResponse.json({ error: "الموظف مضاف أصلاً بهذه الخانة" }, { status: 409 });
  }

  return NextResponse.json({ assignment: data });
}

export async function DELETE(request) {
  const session = await getSession(request);
  if (!session || session.accessRole !== "admin") {
    return NextResponse.json({ error: "هذا الإجراء للمدير فقط" }, { status: 403 });
  }

  const supabase = getSupabaseServer();
  if (!(await isEditable(supabase))) {
    return NextResponse.json({ error: "الجدول منشور، لا يمكن التعديل" }, { status: 409 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

  const { error } = await supabase.from("schedule_assignments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "تعذر الحذف" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
