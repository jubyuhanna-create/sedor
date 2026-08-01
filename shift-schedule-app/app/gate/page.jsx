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
      setError("הקוד חייב להיות 4 ספרות");
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
        className="w-full max-w-sm bg-[#123244] border border-[#1c3f4f] rounded-2xl p-7 space-y-5 shadow-2xl shadow-black/30"
      >
        <div className="flex flex-col items-center gap-3 mb-1">
          <div className="w-20 h-20 rounded-2xl bg-[#90d3d9] p-2.5 flex items-center justify-center shadow-lg shadow-[#90d3d9]/20">
            <img src="/logo.png" alt="רסיس" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white tracking-tight">מסעדת רסיס</h1>
            <p className="text-xs text-[#90d3d9] font-medium mt-0.5">לוח משמרות שבועי</p>
          </div>
        </div>

        <p className="text-sm text-gray-400 text-center">הזן קוד בן 4 ספרות לצפייה בסידור</p>

        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="w-full bg-[#0c2635] text-white text-center text-2xl tracking-[0.5em] rounded-xl border border-[#1c3f4f] focus:border-[#90d3d9] focus:outline-none px-3 py-3 transition"
          autoFocus
        />

        {error && (
          <div className="text-sm text-red-300 bg-red-950/40 border border-red-900/60 rounded-lg px-3 py-2 text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#90d3d9] hover:bg-[#7cc3ca] disabled:opacity-50 text-[#0c2635] font-bold rounded-xl py-3 transition"
        >
          {loading ? "..." : "כניסה"}
        </button>

        <div className="text-center pt-1">
          <a href="/login" className="text-xs text-gray-500 hover:text-[#90d3d9] underline transition">
            אני מנהל — התחברות
          </a>
        </div>
      </form>
    </div>
  );
}
