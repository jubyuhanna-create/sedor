"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import InstallGuideButton from "../../components/InstallGuideButton";

export default function GatePage() {
  const router = useRouter();
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputsRef = useRef([]);

  const pin = digits.join("");

  useEffect(() => {
    if (pin.length === 4 && !loading) {
      submit(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  function handleChange(index, value) {
    const clean = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = clean;
      return next;
    });
    if (clean && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (text.length === 4) {
      setDigits(text.split(""));
      inputsRef.current[3]?.focus();
    }
    e.preventDefault();
  }

  async function submit(fullPin) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/gate-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: fullPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "אירעה שגיאה");
        setShake(true);
        setDigits(["", "", "", ""]);
        inputsRef.current[0]?.focus();
        setTimeout(() => setShake(false), 500);
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
      <div className="w-full max-w-sm bg-[#123244] border border-[#1c3f4f] rounded-2xl p-7 space-y-5 shadow-2xl shadow-black/30 animate-fade-in">
        <div className="flex flex-col items-center gap-3 mb-1">
          <div className="w-20 h-20 rounded-2xl bg-[#90d3d9] p-2.5 flex items-center justify-center shadow-lg shadow-[#90d3d9]/20">
            <img src="/logo.png" alt="רסיס" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white tracking-tight">מסעדת רסיס</h1>
            <p className="text-xs text-[#90d3d9] font-medium mt-0.5">לוח משמרות שבועי</p>
          </div>
        </div>

        <p className="text-sm text-gray-400 text-center">הזן קוד בן 4 ספרות לצפייה בסידור</p>

        <div className={`flex justify-center gap-3 ${shake ? "animate-shake" : ""}`} dir="ltr">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              disabled={loading}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              className="w-14 h-14 bg-[#0c2635] text-white text-center text-2xl font-semibold rounded-xl border border-[#1c3f4f] focus:border-[#90d3d9] focus:outline-none transition disabled:opacity-50"
              autoFocus={i === 0}
            />
          ))}
        </div>

        {error && (
          <div className="text-sm text-red-300 bg-red-950/40 border border-red-900/60 rounded-lg px-3 py-2 text-center animate-fade-in">
            {error}
          </div>
        )}

        <button
          onClick={() => pin.length === 4 && submit(pin)}
          disabled={loading || pin.length !== 4}
          className="w-full bg-[#90d3d9] hover:bg-[#7cc3ca] disabled:opacity-50 text-[#0c2635] font-bold rounded-xl py-3 transition"
        >
          {loading ? "..." : "כניסה"}
        </button>

        <div className="text-center pt-1">
          <a href="/login" className="text-xs text-gray-500 hover:text-[#90d3d9] underline transition">
            אני מנהל — התחברות
          </a>
        </div>
        <div className="pt-1">
          <InstallGuideButton />
        </div>
      </div>
    </div>
  );
}
