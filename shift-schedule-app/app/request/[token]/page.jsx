"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// מפתח ייחודי לכל תא: יום|משמרת
function cellKey(day, shift) {
  return `${day}|${shift}`;
}

export default function RequestPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [choices, setChoices] = useState({}); // key -> { wantsToWork, note }
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    load();
  }, [token]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/requests/${token}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "אירעה שגיאה");
        return;
      }
      setData(json);
      const initial = {};
      (json.existingRequests || []).forEach((r) => {
        initial[cellKey(r.day_name, r.shift_name)] = {
          wantsToWork: r.wants_to_work,
          note: r.note || "",
        };
      });
      setChoices(initial);
    } catch {
      setError("לא ניתן להתחבר לשרת");
    } finally {
      setLoading(false);
    }
  }

  function setChoice(day, shift, wantsToWork) {
    setChoices((prev) => ({
      ...prev,
      [cellKey(day, shift)]: { ...prev[cellKey(day, shift)], wantsToWork },
    }));
  }

  async function handleSubmit() {
    setSaving(true);
    setSaved(false);
    try {
      const requests = Object.entries(choices).map(([key, val]) => {
        const [dayName, shiftName] = key.split("|");
        return { dayName, shiftName, wantsToWork: val.wantsToWork, note: val.note };
      });
      const res = await fetch(`/api/requests/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      });
      if (res.ok) {
        setSaved(true);
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "אירעה שגיאה בשמירה");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#0c2635] text-[#90d3d9] flex items-center justify-center">
        טוען...
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#0c2635] text-red-300 flex items-center justify-center p-4 text-center">
        {error}
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#0c2635] text-gray-100 p-4 sm:p-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3 bg-[#123244] border border-[#1c3f4f] rounded-2xl p-4">
          <div className="w-11 h-11 rounded-xl bg-[#90d3d9] p-1.5 flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="רסיס" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">מסעדת רסיס</h1>
            <p className="text-xs text-[#90d3d9] font-medium">
              שלום {data.staffName} — בקשת משמרות לשבוע הבא
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-400 text-center">
          סמן/י באילו ימים ומשמרות תרצה/י לעבוד בשבוע הבא. אפשר לשנות ולשלוח שוב עד לפרסום הסידור.
        </p>

        <div className="bg-[#123244] border border-[#1c3f4f] rounded-2xl overflow-hidden">
          {data.shifts.map((shift) => (
            <div key={shift}>
              <div className="bg-[#0c2635] text-[#90d3d9] font-bold px-4 py-2 text-sm">{shift}</div>
              <div className="divide-y divide-[#1c3f4f]">
                {data.days.map((day) => {
                  const key = cellKey(day, shift);
                  const current = choices[key];
                  return (
                    <div key={day} className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm font-medium text-gray-100">{day}</span>
                        <span className="text-xs text-gray-500">{data.weekDateLabels[day]}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setChoice(day, shift, true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            current?.wantsToWork === true
                              ? "bg-[#90d3d9] text-[#0c2635]"
                              : "bg-[#0c2635] text-gray-400 border border-[#1c3f4f]"
                          }`}
                        >
                          ✅ בדי אשتغل
                        </button>
                        <button
                          onClick={() => setChoice(day, shift, false)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            current?.wantsToWork === false
                              ? "bg-red-900/60 text-red-200 border border-red-700"
                              : "bg-[#0c2635] text-gray-400 border border-[#1c3f4f]"
                          }`}
                        >
                          ❌ مش متوفر
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-[#90d3d9] hover:bg-[#7cc3ca] disabled:opacity-50 text-[#0c2635] font-bold rounded-xl py-3 transition"
        >
          {saving ? "..." : "שליחת הבקשה"}
        </button>

        {saved && (
          <div className="text-sm text-[#90d3d9] bg-[#90d3d9]/10 border border-[#90d3d9]/30 rounded-lg px-4 py-2 text-center">
            הבקשה נשלחה בהצלחה ✅
          </div>
        )}
      </div>
    </div>
  );
}
