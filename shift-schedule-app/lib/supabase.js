import { createClient } from "@supabase/supabase-js";

// هاد الكلاينت يستخدم فقط داخل API routes (سيرفر) — أبداً لا تستورده داخل مكون client
export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase env vars missing. تأكد من ملف .env.local");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
