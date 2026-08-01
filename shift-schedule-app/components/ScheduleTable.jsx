"use client";

import { useState } from "react";

const DAYS = ["שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת", "ראשון"];
const SHIFTS = ["משמרת בוקר", "משמרת ערב"];
const POSITIONS = ["מלצרים", "בר", "מטבח", "טאבון / שטיפה", "מנהל"];

function generateTimeOptions(shift) {
  const pad = (n) => String(n).padStart(2, "0");
  if (shift === "משמרת בוקר") {
    const opts = ["פתיחה"];
    for (let h = 7; h < 16; h++) {
      opts.push(`${pad(h)}:00`);
      opts.push(`${pad(h)}:30`);
    }
    opts.push("16:00");
    return opts;
  }
  const opts = [];
  for (let h = 16; h < 24; h++) {
    opts.push(`${pad(h)}:00`);
    opts.push(`${pad(h)}:30`);
  }
  opts.push("00:00");
  return opts;
}

// מחזיר מיפוי { שם יום -> "יום/חודש" } עבור השבוע הנוכחי (שני עד ראשון).
// מבוסס על תאריך היום בפועל, אז מתעדכן לבד משבוע לשבוע.
function getWeekDateLabels() {
  const today = new Date();
  const jsDay = today.getDay();
  const diffToMonday = jsDay === 0 ? 6 : jsDay - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const labels = {};
  DAYS.forEach((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    labels[day] = `${d.getDate()}/${d.getMonth() + 1}`;
  });
  return labels;
}

function buildAssignmentMap(assignments) {
  const map = {};
  SHIFTS.forEach((shift) =>
    POSITIONS.forEach((position) =>
      DAYS.forEach((day) => {
        map[`${shift}|${position}|${day}`] = [];
      })
    )
  );
  assignments.forEach((a) => {
    const key = `${a.shift_name}|${a.position_name}|${a.day_name}`;
    if (key in map) {
      map[key].push({
        id: a.id,
        staffId: a.staff_id,
        name: a.staff_members?.name || "",
        shiftTime: a.shift_time || "",
      });
    }
  });
  return map;
}

export default function ScheduleTable({
  session,
  initialAssignments,
  initialStaff,
  initialPublished,
  initialViewPin,
  onLogout,
}) {
  const [assignmentMap, setAssignmentMap] = useState(() => buildAssignmentMap(initialAssignments));
  const [staffList, setStaffList] = useState(initialStaff);
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [publishing, setPublishing] = useState(false);
  const [busyKey, setBusyKey] = useState(null);

  const isAdmin = session?.accessRole === "admin";
  const allowedPositions = session?.allowedPositions || [];
  const weekDateLabels = getWeekDateLabels();

  function canEditPosition(position) {
    if (isAdmin) return !isPublished;
    return allowedPositions.includes(position);
  }

  function availableStaff(position, currentList) {
    const takenIds = new Set(currentList.map((p) => p.staffId));
    return staffList.filter((s) => s.position_name === position && !takenIds.has(s.id));
  }

  async function handleAdd(shift, position, day, staffId, shiftTime) {
    if (!staffId || !shiftTime) return;
    const key = `${shift}|${position}|${day}`;
    setBusyKey(key);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftName: shift, positionName: position, dayName: day, staffId, shiftTime }),
      });
      const data = await res.json();
      if (res.ok) {
        setAssignmentMap((prev) => ({
          ...prev,
          [key]: [
            ...prev[key],
            {
              id: data.assignment.id,
              staffId,
              name: data.assignment.staff_members?.name || "",
              shiftTime: data.assignment.shift_time || shiftTime,
            },
          ],
        }));
      } else {
        alert(data.error || "אירעה שגיאה");
      }
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRemove(shift, position, day, assignmentId) {
    const key = `${shift}|${position}|${day}`;
    setBusyKey(key);
    try {
      const res = await fetch("/api/assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assignmentId }),
      });
      if (res.ok) {
        setAssignmentMap((prev) => ({
          ...prev,
          [key]: prev[key].filter((p) => p.id !== assignmentId),
        }));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "אירעה שגיאה");
      }
    } finally {
      setBusyKey(null);
    }
  }

  async function handleAddStaff(name, positionName) {
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, positionName }),
    });
    const data = await res.json();
    if (res.ok) setStaffList((prev) => [...prev, data.staff]);
  }

  async function handleDeleteStaff(id) {
    const res = await fetch("/api/staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setStaffList((prev) => prev.filter((s) => s.id !== id));
      setAssignmentMap((prev) => {
        const next = {};
        Object.keys(prev).forEach((key) => {
          next[key] = prev[key].filter((p) => p.staffId !== id);
        });
        return next;
      });
    }
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
      if (res.ok) setIsPublished(data.isPublished);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#0c2635] text-gray-100 p-4 sm:p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#123244] border border-[#1c3f4f] rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#90d3d9] p-1.5 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="רסיס" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">מסעדת רסיס</h1>
              <p className="text-xs text-[#90d3d9] font-medium">
                {isAdmin ? "מנהל" : "אחראי משמרות"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={togglePublish}
                disabled={publishing}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                  isPublished
                    ? "bg-[#1c3f4f] text-gray-200 hover:bg-[#254d5f]"
                    : "bg-[#90d3d9] text-[#0c2635] hover:bg-[#7cc3ca]"
                }`}
              >
                {publishing ? "..." : isPublished ? "חזרה לעריכה" : "פרסם"}
              </button>
            )}
            <button
              onClick={onLogout}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-[#1c3f4f] text-gray-300 hover:bg-[#254d5f] transition"
            >
              יציאה
            </button>
          </div>
        </div>

        {isPublished && (
          <div className="text-sm text-[#90d3d9] bg-[#90d3d9]/10 border border-[#90d3d9]/30 rounded-lg px-4 py-2">
            הסידור פורסם — תצוגה בלבד
          </div>
        )}

        {isAdmin && (
          <StaffManager
            staffList={staffList}
            onAdd={handleAddStaff}
            onDelete={handleDeleteStaff}
            viewPin={initialViewPin}
          />
        )}

        <div className="overflow-x-auto bg-[#123244] border border-[#1c3f4f] rounded-2xl">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky right-0 bg-[#123244] text-right text-gray-400 font-medium p-3 border-b border-[#1c3f4f] min-w-[130px]">
                  תפקיד
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="text-center text-gray-300 font-semibold p-3 border-b border-[#1c3f4f] min-w-[140px]"
                  >
                    <div>{day}</div>
                    <div className="text-xs text-[#90d3d9]/70 font-normal mt-0.5">
                      {weekDateLabels[day]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHIFTS.map((shift) => (
                <RowsForShift
                  key={shift}
                  shift={shift}
                  assignmentMap={assignmentMap}
                  canEditPosition={canEditPosition}
                  busyKey={busyKey}
                  availableStaff={availableStaff}
                  onAdd={handleAdd}
                  onRemove={handleRemove}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RowsForShift({ shift, assignmentMap, canEditPosition, busyKey, availableStaff, onAdd, onRemove }) {
  return (
    <>
      <tr>
        <td
          colSpan={DAYS.length + 1}
          className="bg-[#0c2635] text-[#90d3d9] font-bold p-2.5 border-y border-[#1c3f4f]"
        >
          {shift}
        </td>
      </tr>
      {POSITIONS.map((position) => {
        const rowCanEdit = canEditPosition(position);
        return (
          <tr key={position} className="hover:bg-[#0c2635]/40">
            <td className="sticky right-0 bg-[#123244] text-gray-300 font-medium p-3 border-b border-[#1c3f4f]/70 align-top">
              {position}
            </td>
            {DAYS.map((day) => {
              const key = `${shift}|${position}|${day}`;
              const list = assignmentMap[key] || [];
              const options = rowCanEdit ? availableStaff(position, list) : [];
              return (
                <td key={day} className="p-1.5 border-b border-[#1c3f4f]/70 align-top">
                  <div className="flex flex-col gap-1">
                    {list.map((person) => (
                      <span
                        key={person.id}
                        className="flex items-center justify-between gap-1 bg-[#0c2635] rounded-md px-2 py-1 text-xs"
                      >
                        <span className="flex flex-col leading-tight">
                          <span className="text-gray-100">{person.name}</span>
                          {person.shiftTime && (
                            <span className="text-[10px] text-[#90d3d9]">{person.shiftTime}</span>
                          )}
                        </span>
                        {rowCanEdit && (
                          <button
                            onClick={() => onRemove(shift, position, day, person.id)}
                            className="text-gray-500 hover:text-red-400 leading-none"
                            aria-label="הסר"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}

                    {list.length === 0 && !rowCanEdit && (
                      <span className="text-gray-600 italic text-xs">—</span>
                    )}

                    {rowCanEdit && (
                      <AddSlot
                        shift={shift}
                        position={position}
                        day={day}
                        options={options}
                        busy={busyKey === key}
                        onAdd={onAdd}
                      />
                    )}
                  </div>
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

function AddSlot({ shift, position, day, options, busy, onAdd }) {
  const [pendingStaffId, setPendingStaffId] = useState("");
  const timeOptions = generateTimeOptions(shift);

  if (!pendingStaffId) {
    return (
      <select
        value=""
        disabled={busy}
        onChange={(e) => setPendingStaffId(e.target.value)}
        className="w-full bg-[#0c2635] text-gray-400 text-xs rounded-md border border-[#1c3f4f] focus:border-[#90d3d9] focus:outline-none px-1.5 py-1"
      >
        <option value="">+ הוסף</option>
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <select
        autoFocus
        value=""
        disabled={busy}
        onChange={(e) => {
          const time = e.target.value;
          if (time) {
            onAdd(shift, position, day, pendingStaffId, time);
            setPendingStaffId("");
          }
        }}
        className="w-full bg-[#0c2635] text-[#90d3d9] text-xs rounded-md border border-[#90d3d9]/60 focus:border-[#90d3d9] focus:outline-none px-1.5 py-1"
      >
        <option value="">בחר שעה</option>
        {timeOptions.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <button
        onClick={() => setPendingStaffId("")}
        className="text-gray-500 hover:text-red-400 text-xs leading-none"
        aria-label="ביטול"
      >
        ×
      </button>
    </div>
  );
}

function StaffManager({ staffList, onAdd, onDelete, viewPin }) {
  return (
    <div className="bg-[#123244] border border-[#1c3f4f] rounded-2xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-white font-bold">ניהול עובדים</h2>
        <PinManager currentPin={viewPin} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {POSITIONS.map((position) => (
          <div key={position} className="space-y-2">
            <h3 className="text-[#90d3d9] text-sm font-semibold">{position}</h3>
            <div className="flex flex-wrap gap-1 min-h-[24px]">
              {staffList
                .filter((s) => s.position_name === position)
                .map((s) => (
                  <span
                    key={s.id}
                    className="flex items-center gap-1 bg-[#0c2635] rounded-md px-2 py-1 text-xs text-gray-200"
                  >
                    {s.name}
                    <button
                      onClick={() => onDelete(s.id)}
                      className="text-gray-500 hover:text-red-400 leading-none"
                      aria-label="מחק"
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
            <AddStaffForm position={position} onAdd={onAdd} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AddStaffForm({ position, onAdd }) {
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) {
          onAdd(name.trim(), position);
          setName("");
        }
      }}
      className="flex gap-1"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="שם חדש"
        className="flex-1 min-w-0 bg-[#0c2635] text-gray-100 text-xs rounded-md border border-[#1c3f4f] focus:border-[#90d3d9] focus:outline-none px-2 py-1"
      />
      <button
        type="submit"
        className="shrink-0 bg-[#90d3d9] hover:bg-[#7cc3ca] text-[#0c2635] font-bold text-xs rounded-md px-2.5"
      >
        +
      </button>
    </form>
  );
}

function PinManager({ currentPin }) {
  const [pin, setPin] = useState(currentPin || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    if (!/^\d{4}$/.test(pin)) {
      setMsg("חייב 4 ספרות");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewPin: pin }),
      });
      setMsg(res.ok ? "נשמר" : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400">קוד כניסה:</span>
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        className="w-16 bg-[#0c2635] text-gray-100 text-center rounded-md border border-[#1c3f4f] px-2 py-1"
      />
      <button
        onClick={save}
        disabled={saving}
        className="bg-[#1c3f4f] hover:bg-[#254d5f] disabled:opacity-50 text-gray-200 rounded-md px-3 py-1"
      >
        {saving ? "..." : "שמור"}
      </button>
      {msg && <span className="text-xs text-gray-500">{msg}</span>}
    </div>
  );
}
