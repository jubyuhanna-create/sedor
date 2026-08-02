"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        setError(data.error || "אירעה שגיאה");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("לא ניתן להתחבר לשרת");
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#0c2635] flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[#123244] border border-[#1c3f4f] rounded-2xl p-7 space-y-5 shadow-2xl shadow-black/30 animate-fade-in"
      >
        <div className="flex flex-col items-center gap-3 mb-1">
          <div className="w-20 h-20 rounded-2xl bg-[#90d3d9] p-2.5 flex items-center justify-center shadow-lg shadow-[#90d3d9]/20">
            <img src="/logo.png" alt="רסיס" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white tracking-tight">מסעדת רסיס</h1>
            <p className="text-xs text-[#90d3d9] font-medium mt-0.5">התחברות מנהל</p>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">שם משתמש</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-[#0c2635] text-white rounded-xl border border-[#1c3f4f] focus:border-[#90d3d9] focus:outline-none px-3 py-2.5 transition"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">סיסמה</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0c2635] text-white rounded-xl border border-[#1c3f4f] focus:border-[#90d3d9] focus:outline-none px-3 py-2.5 pl-10 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#90d3d9] text-xs transition"
              tabIndex={-1}
            >
              {showPassword ? "הסתר" : "הצג"}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-300 bg-red-950/40 border border-red-900/60 rounded-lg px-3 py-2 animate-fade-in">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#90d3d9] hover:bg-[#7cc3ca] disabled:opacity-50 text-[#0c2635] font-bold rounded-xl py-3 transition"
        >
          {loading ? "מתחבר..." : "כניסה"}
        </button>

        <div className="text-center pt-1">
          <a href="/gate" className="text-xs text-gray-500 hover:text-[#90d3d9] underline transition">
            חזרה לצפייה בסידור
          </a>
        </div>
      </form>
    </div>
  );
}
