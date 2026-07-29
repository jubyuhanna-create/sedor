"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
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
        <h1 className="text-xl font-bold text-white text-center">
          תسجيل دخول — סידור עבודה
        </h1>

        <div>
          <label className="block text-sm text-gray-400 mb-1">اسم المستخدم</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-gray-800 text-gray-100 rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none px-3 py-2"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-800 text-gray-100 rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none px-3 py-2"
          />
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 transition"
        >
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </form>
    </div>
  );
}
