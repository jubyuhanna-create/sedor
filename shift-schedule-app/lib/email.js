const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "מסעדת רסיס <onboarding@resend.dev>";

// שולח מייל בודד דרך Resend. לא זורק שגיאה קריטית — רק מדפיס ללוג אם נכשל,
// כדי שכשל בשליחת מייל לא יפיל פעולה אחרת (כמו שמירת שיבוץ).
export async function sendEmail({ to, subject, html }) {
  if (!to) return { skipped: true };
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY חסר — לא ניתן לשלוח מיילים");
    return { ok: false };
  }
  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("שליחת מייל נכשלה:", errText);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("שגיאה בשליחת מייל:", e);
    return { ok: false };
  }
}

function baseWrapper(bodyHtml) {
  return `
    <div dir="rtl" style="font-family: sans-serif; background:#0c2635; padding:24px; color:#e5e7eb;">
      <div style="max-width:480px;margin:0 auto;background:#123244;border-radius:16px;padding:24px;border:1px solid #1c3f4f;">
        <h1 style="color:#90d3d9;font-size:18px;margin:0 0 16px;">מסעדת רסיס</h1>
        ${bodyHtml}
      </div>
    </div>
  `;
}

export function requestReminderEmail({ name, link }) {
  return baseWrapper(`
    <p>שלום ${name},</p>
    <p>הגיע הזמן לשלוח את בקשת המשמרות שלך לשבוע הבא.</p>
    <p>
      <a href="${link}" style="display:inline-block;background:#90d3d9;color:#0c2635;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
        מילוי הבקשה
      </a>
    </p>
  `);
}

export function schedulePublishedEmail({ name, link }) {
  return baseWrapper(`
    <p>שלום ${name},</p>
    <p>הסידור לשבוע הקרוב פורסם.</p>
    <p>
      <a href="${link}" style="display:inline-block;background:#90d3d9;color:#0c2635;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
        צפייה בסידור
      </a>
    </p>
  `);
}

export function scheduleChangedEmail({ name, link }) {
  return baseWrapper(`
    <p>שלום ${name},</p>
    <p>חל שינוי במשמרות שלך בסידור שכבר פורסם.</p>
    <p>
      <a href="${link}" style="display:inline-block;background:#90d3d9;color:#0c2635;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
        צפייה בסידור המעודכן
      </a>
    </p>
  `);
}
