"use client";

import { useState } from "react";

const DAYS = ["שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת", "ראשון"];
const SHIFTS = ["משמרת בוקר", "משמרת ערב"];
const POSITIONS = ["מלצרים", "בר", "מטבח", "טאבון / שטיפה", "מנהל"];

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
      map[key].push({ id: a.id, staffId: a.staff_id, name: a.staff_members?.name || "" });
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

  // بيرجع true إذا المستخدم الحالي مسموحله يعدل هالقسم بالذات
  function canEditPosition(position) {
    if (isPublished) return false;
    if (isAdmin) return true;
    return allowedPositions.includes(position);
  }

  function availableStaff(position, currentList) {
    const takenIds = new Set(currentList.map((p) => p.staffId));
    return staffList.filter((s) => s.position_name === position && !takenIds.has(s.id));
  }

  async function handleAdd(shift, position, day, staffId) {
    if (!staffId) return;
    const key = `${shift}|${position}|${day}`;
    setBusyKey(key);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftName: shift, positionName: position, dayName: day, staffId }),
      });
      const data = await res.json();
      if (res.ok) {
        setAssignmentMap((prev) => ({
          ...prev,
          [key]: [...prev[key], { id: data.assignment.id, staffId, name: data.assignment.staff_members?.name || "" }],
        }));
      } else {
        alert(data.error || "حدث خطأ");
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
        alert(data.error || "حدث خطأ");
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
    <div dir="rtl" className="min-h-screen bg-gray-950 text-gray-100 p-4 sm:p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div>
            <h1 className="text-xl font-bold text-white">סידור עבודה שבועי</h1>
            <p className="text-sm text-gray-400">{isAdmin ? "מנהל" : "עובד"}</p>
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

        {isAdmin && (
          <StaffManager
            staffList={staffList}
            onAdd={handleAddStaff}
            onDelete={handleDeleteStaff}
            viewPin={initialViewPin}
          />
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
                    className="text-center text-gray-300 font-semibold p-3 border-b border-gray-800 min-w-[140px]"
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
          className="bg-gray-800/70 text-blue-300 font-bold p-2.5 border-y border-gray-700"
        >
          {shift}
        </td>
      </tr>
      {POSITIONS.map((position) => {
        const rowCanEdit = canEditPosition(position);
        return (
          <tr key={position} className="hover:bg-gray-800/30">
            <td className="sticky right-0 bg-gray-900 text-gray-300 font-medium p-3 border-b border-gray-800/70 align-top">
              {position}
            </td>
            {DAYS.map((day) => {
              const key = `${shift}|${position}|${day}`;
              const list = assignmentMap[key] || [];
              const options = rowCanEdit ? availableStaff(position, list) : [];
              return (
                <td key={day} className="p-1.5 border-b border-gray-800/70 align-top">
                  <div className="flex flex-col gap-1">
                    {list.map((person) => (
                      <span
                        key={person.id}
                        className="flex items-center justify-between gap-1 bg-gray-800 rounded-md px-2 py-1 text-xs"
                      >
                        <span className="text-gray-100">{person.name}</span>
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
                      <select
                        value=""
                        disabled={busyKey === key}
                        onChange={(e) => onAdd(shift, position, day, e.target.value)}
                        className="w-full bg-gray-900 text-gray-400 text-xs rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none px-1.5 py-1"
                      >
                        <option value="">+ הוסף</option>
                        {options.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
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

function StaffManager({ staffList, onAdd, onDelete, viewPin }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-white font-bold">إدارة الموظفين</h2>
        <PinManager currentPin={viewPin} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {POSITIONS.map((position) => (
          <div key={position} className="space-y-2">
            <h3 className="text-blue-300 text-sm font-semibold">{position}</h3>
            <div className="flex flex-wrap gap-1 min-h-[24px]">
              {staffList
                .filter((s) => s.position_name === position)
                .map((s) => (
                  <span
                    key={s.id}
                    className="flex items-center gap-1 bg-gray-800 rounded-md px-2 py-1 text-xs text-gray-200"
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
        placeholder="اسم جديد"
        className="flex-1 min-w-0 bg-gray-800 text-gray-100 text-xs rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none px-2 py-1"
      />
      <button
        type="submit"
        className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md px-2.5"
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
      setMsg("لازم 4 أرقام");
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
      setMsg(res.ok ? "تم الحفظ" : "خطأ بالحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400">רمز الدخول:</span>
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        className="w-16 bg-gray-800 text-gray-100 text-center rounded-md border border-gray-700 px-2 py-1"
      />
      <button
        onClick={save}
        disabled={saving}
        className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 rounded-md px-3 py-1"
      >
        {saving ? "..." : "حفظ"}
      </button>
      {msg && <span className="text-xs text-gray-500">{msg}</span>}
    </div>
  );
}
