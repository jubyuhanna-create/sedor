# סידור עבודה — نظام جدول الشيفتات

تطبيق Next.js + Supabase لجدول شيفتات أسبوعي، مع تسجيل دخول بسيط (اسم مستخدم / كلمة مرور) وصلاحيتين: مدير (מנהל) وموظف (עובד).

## 1. إنشاء مشروع Supabase

1. افتح https://supabase.com وسجّل دخول (أو أنشئ حساب).
2. اضغط **New project**.
3. اختار اسم المشروع، كلمة مرور لقاعدة البيانات (احفظها بمكان آمن)، والمنطقة الأقرب لك (مثلاً Frankfurt أو أقرب منطقة متاحة).
4. انتظر لين المشروع يخلص بالتجهيز (بياخد دقيقة أو دقيقتين).

## 2. تشغيل السكيما (الجداول)

1. من القائمة الجانبية بمشروع Supabase، افتح **SQL Editor**.
2. اضغط **New query**.
3. انسخ كل محتوى ملف `supabase/schema.sql` من هذا المشروع، وألصقه، واضغط **Run**.
4. تأكد ما فيه أخطاء — هيك صار عندك 3 جداول: `employees`, `schedule_entries`, `schedule_status`.

## 3. جلب مفاتيح API

1. من القائمة الجانبية: **Project Settings** -> **API**.
2. انسخ:
   - **Project URL** → بيروح بـ `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** (مو anon key — لازم service_role لأنه بيتخطى الـ RLS) → بيروح بـ `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **تنبيه مهم**: مفتاح `service_role` قوي جداً (بيقدر يقرا/يعدل كل شي بدون قيود). ما تحطه أبداً بكود يشتغل بالمتصفح (client-side) — بهذا المشروع هو مستخدم فقط داخل API routes على السيرفر، وهذا هو الصح.

## 4. إعداد ملف البيئة

1. انسخ الملف `.env.local.example` وسمّيه `.env.local`.
2. عبّي فيه:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   SESSION_SECRET=...
   ```
3. لتوليد `SESSION_SECRET` (نص عشوائي طويل)، شغّل بالتيرمينال:
   ```bash
   openssl rand -base64 32
   ```
   وانسخ الناتج.

## 5. تثبيت الحزم وتشغيل المشروع محلياً

```bash
npm install
npm run dev
```

افتح `http://localhost:3000` — رح يحولك تلقائياً لصفحة تسجيل الدخول لأنه لسا ما فيه مستخدمين.

## 6. إنشاء أول حساب مدير

1. اختار كلمة مرور للمدير، وشغّل بالتيرمينال:
   ```bash
   npm run hash-password -- "rases"
   ```
2. رح يطبعلك hash طويل يشبه: `$2a$10$abcdefg...`
3. روح على Supabase -> **Table Editor** -> جدول `employees` -> **Insert row**، وعبّي:
   - `username`: مثلاً `admin`
   - `password_hash`: الـ hash يلي طلع معك
   - `display_name`: اسم المدير (مثلاً "أبو محمد")
   - `access_role`: `admin`
4. احفظ (Save).

كرر نفس الخطوات لإضافة موظفين، بس خلي `access_role` = `employee`.

## 7. تسجيل الدخول

روح `http://localhost:3000/login` وسجّل دخول بالـ username وكلمة المرور يلي سويتها. المدير رح يشوف أزرار التعديل والنشر، الموظف رح يشوف الجدول للقراءة بس.

## 8. النشر على Vercel

1. ارفع المشروع على GitHub (repo جديد).
2. من https://vercel.com اعمل **New Project** واختار الـ repo.
3. بصفحة الإعدادات قبل الـ deploy، ضيف نفس متغيرات البيئة (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`) تحت **Environment Variables**.
4. اضغط **Deploy**.
5. بعد ما يخلص، رح تاخد رابط زي `https://your-app.vercel.app` — هاد الرابط شارك فيه الموظفين.

## ملاحظات

- كل تعديل بخانة بيتحفظ فوراً بقاعدة البيانات (Supabase) لما تطلع من الخانة (onBlur).
- لما المدير يضغط **פרסם**، الجدول يصير read-only للكل (حتى المدير) لين يضغط "חזרה לעריכה".
- لإضافة/حذف موظفين لاحقاً: من Table Editor بـ Supabase مباشرة، أو أقدر أبنيلك صفحة إدارة مستخدمين لو حبيت.
