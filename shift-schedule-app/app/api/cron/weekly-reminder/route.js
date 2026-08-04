import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../../lib/supabase";
import { sendEmail, requestReminderEmail } from "../../../../lib/email";

// GET — נקרא אוטומטית ע"י Vercel Cron כל יום חמישי. שולח לכל עובד עם אימייל
// את הקישור האישי הקבוע שלו למילוי בקשת המשמרות לשבוע הבא.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  const { data: staff, error } = await supabase
    .from("staff_members")
    .select("name, email, request_token")
    .not("email", "is", null);

  if (error) return NextResponse.json({ error: "טעינת העובדים נכשלה" }, { status: 500 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  let sent = 0;

  for (const s of staff || []) {
    if (!s.email) continue;
    const link = `${siteUrl}/request/${s.request_token}`;
    const result = await sendEmail({
      to: s.email,
      subject: "בקשת משמרות לשבוע הבא — מסעדת רסיס",
      html: requestReminderEmail({ name: s.name, link }),
    });
    if (result.ok) sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
