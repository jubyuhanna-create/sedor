"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GatePage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!/^\d{4}$/.test(pin)) {
      setError("الرمز يجب أن يكون 4 أرقام");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/gate-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "حدث خطأ");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالسيرفر");
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4"
      >
        <h1 className="text-xl font-bold text-white text-center">סידור עבודה</h1>
        <p className="text-sm text-gray-400 text-center">أدخل الرمز المكوّن من 4 أرقام لعرض الجدول</p>

        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="w-full bg-gray-800 text-gray-100 text-center text-2xl tracking-[0.5em] rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none px-3 py-3"
          autoFocus
        />

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2 text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 transition"
        >
          {loading ? "..." : "دخول"}
        </button>

        <div className="text-center pt-2">
          <a href="/login" className="text-xs text-gray-500 hover:text-gray-300 underline">
            أنا مدير — تسجيل دخول
          </a>
        </div>
      </form>
    </div>
  );
}
