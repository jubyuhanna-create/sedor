"use client";

import { useState } from "react";

const DAYS = ["שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת", "ראשון"];
const SHIFTS = ["משמרת בוקר", "משמרת ערב"];
const POSITIONS = ["מלצרים", "בר", "מטבח", "טאבון / שטיפה", "מנהל"];

function buildGrid(entries) {
  const grid = {};
  SHIFTS.forEach((shift) => {
    POSITIONS.forEach((position) => {
      DAYS.forEach((day) => {
        grid[`${shift}|${position}|${day}`] = "";
      });
    });
  });
  entries.forEach((e) => {
    const key = `${e.shift_name}|${e.position_name}|${e.day_name}`;
    if (key in grid) grid[key] = e.employee_name || "";
  });
  return grid;
}

export default function ScheduleTable({ session, initialEntries, initialPublished, onLogout, onReload }) {
  const [grid, setGrid] = useState(() => buildGrid(initialEntries));
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [savingKey, setSavingKey] = useState(null);
  const [publishing, setPublishing] = useState(false);

  const isAdmin = session?.accessRole === "admin";
  const canEdit = isAdmin && !isPublished;

  async function saveCell(shift, position, day, value) {
    const key = `${shift}|${position}|${day}`;
    setSavingKey(key);
    try {
      await fetch("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftName: shift, positionName: position, dayName: day, employeeName: value }),
      });
    } finally {
      setSavingKey(null);
    }
  }

  function handleChange(key, value) {
    setGrid((prev) => ({ ...prev, [key]: value }));
  }

  function handleBlur(shift, position, day) {
    const key = `${shift}|${position}|${day}`;
    saveCell(shift, position, day, grid[key]);
  }

  async function togglePublish() {
    setPublishing(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: !isPublished }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsPublished(data.isPublished);
        onReload?.();
      }
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-950 text-gray-100 p-4 sm:p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div>
            <h1 className="text-xl font-bold text-white">סידור עבודה שבועי</h1>
            <p className="text-sm text-gray-400">
              {session?.displayName} — {isAdmin ? "מנהל" : "עובד"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={togglePublish}
                disabled={publishing}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                  isPublished
                    ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                    : "bg-emerald-600 text-white hover:bg-emerald-500"
                }`}
              >
                {publishing ? "..." : isPublished ? "חזרה לעריכה" : "פרסם"}
              </button>
            )}
            <button
              onClick={onLogout}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
            >
              خروج
            </button>
          </div>
        </div>

        {isPublished && (
          <div className="text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-lg px-4 py-2">
            הסידור פורסם — תצוגה בלבד
          </div>
        )}

        <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-xl">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky right-0 bg-gray-900 text-right text-gray-400 font-medium p-3 border-b border-gray-800 min-w-[130px]">
                  תפקיד
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="text-center text-gray-300 font-semibold p-3 border-b border-gray-800 min-w-[110px]"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHIFTS.map((shift) => (
                <RowsForShift
                  key={shift}
                  shift={shift}
                  grid={grid}
                  canEdit={canEdit}
                  savingKey={savingKey}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RowsForShift({ shift, grid, canEdit, savingKey, onChange, onBlur }) {
  return (
    <>
      <tr>
        <td
          colSpan={DAYS.length + 1}
          className="bg-gray-800/70 text-blue-300 font-bold p-2.5 border-y border-gray-700"
        >
          {shift}
        </td>
      </tr>
      {POSITIONS.map((position) => (
        <tr key={position} className="hover:bg-gray-800/30">
          <td className="sticky right-0 bg-gray-900 text-gray-300 font-medium p-3 border-b border-gray-800/70">
            {position}
          </td>
          {DAYS.map((day) => {
            const key = `${shift}|${position}|${day}`;
            const value = grid[key];
            return (
              <td key={day} className="p-1.5 border-b border-gray-800/70 text-center align-middle">
                {canEdit ? (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(key, e.target.value)}
                    onBlur={() => onBlur(shift, position, day)}
                    placeholder="שם עובד"
                    className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 text-center rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none px-2 py-1.5"
                  />
                ) : (
                  <span className={value ? "text-gray-100" : "text-gray-600 italic"}>{value || "—"}</span>
                )}
                {savingKey === key && <span className="text-[10px] text-gray-500 block">שומר...</span>}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
