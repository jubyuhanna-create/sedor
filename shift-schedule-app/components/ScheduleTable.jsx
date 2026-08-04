"use client";

import { useState } from "react";
import { DAYS, getWeekDateLabels } from "../lib/weeks";
import { useToast, useConfirm } from "./UIProvider";

const SHIFTS = ["משמרת בוקר", "משמרת ערב"];
const POSITIONS = ["מלצרים", "בר", "מטבח", "טאבון / שטיפה", "מנהל"];

const POSITION_COLORS = {
  "מלצרים": "#6f9bd1",
  "בר": "#d1a24a",
  "מטבח": "#d1785a",
  "טאבון / שטיפה": "#9b8ad1",
  "מנהל": "#7fbfae",
};

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

function buildAssignmentMap(assignments) {
  const map = {};
  SHIFTS.forEach((shift) =>
    POSITIONS.forEach((position) =>
      DAYS.forEach((day) => {
        map[`${shift}|${position}|${day}`] = [];
      })
    )
  );
  (assignments || []).forEach((a) => {
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

function buildWeekState(weekData) {
  return {
    weekStart: weekData.weekStart,
    isPublished: weekData.isPublished,
    readyPositions: weekData.readyPositions || [],
    assignmentMap: buildAssignmentMap(weekData.assignments),
  };
}

export default function ScheduleTable({
  session,
  initialWeeks,
  initialStaff,
  initialViewPin,
  onLogout,
}) {
  const showToast = useToast();
  const confirmDialog = useConfirm();

  const [current, setCurrent] = useState(() => buildWeekState(initialWeeks.current));
  const [next, setNext] = useState(() => buildWeekState(initialWeeks.next));
  const [activeTab, setActiveTab] = useState("current");
  const [staffList, setStaffList] = useState(initialStaff);
  const [publishing, setPublishing] = useState(false);
  const [busyKey, setBusyKey] = useState(null);

  const isAdmin = session?.accessRole === "admin";
  const allowedPositions = session?.allowedPositions || [];

  const week = activeTab === "current" ? current : next;
  const setWeek = activeTab === "current" ? setCurrent : setNext;
  const weekDateLabels = getWeekDateLabels(week.weekStart);

  function canEditPosition(position) {
    if (isAdmin) return !week.isPublished;
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
        body: JSON.stringify({
          weekStart: week.weekStart,
          shiftName: shift,
          positionName: position,
          dayName: day,
          staffId,
          shiftTime,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setWeek((prev) => ({
          ...prev,
          assignmentMap: {
            ...prev.assignmentMap,
            [key]: [
              ...prev.assignmentMap[key],
              {
                id: data.assignment.id,
                staffId,
                name: data.assignment.staff_members?.name || "",
                shiftTime: data.assignment.shift_time || shiftTime,
              },
            ],
          },
        }));
      } else {
        showToast(data.error || "אירעה שגיאה", "error");
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
        setWeek((prev) => ({
          ...prev,
          assignmentMap: {
            ...prev.assignmentMap,
            [key]: prev.assignmentMap[key].filter((p) => p.id !== assignmentId),
          },
        }));
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "אירעה שגיאה", "error");
      }
    } finally {
      setBusyKey(null);
    }
  }

  async function handleAddStaff(name, positionName, email) {
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, positionName, email }),
    });
    const data = await res.json();
    if (res.ok) {
      setStaffList((prev) => [...prev, data.staff]);
    } else {
      showToast(data.error || "אירעה שגיאה", "error");
    }
  }

  async function handleUpdateStaffEmail(id, email) {
    const res = await fetch("/api/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, email }),
    });
    const data = await res.json();
    if (res.ok) {
      setStaffList((prev) => prev.map((s) => (s.id === id ? data.staff : s)));
      showToast("האימייל עודכן", "success");
    } else {
      showToast(data.error || "אירעה שגיאה", "error");
    }
  }

  async function handleDeleteStaff(id) {
    const res = await fetch("/api/staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setStaffList((prev) => prev.filter((s) => s.id !== id));
      const stripStaff = (weekState) => {
        const nextMap = {};
        Object.keys(weekState.assignmentMap).forEach((key) => {
          nextMap[key] = weekState.assignmentMap[key].filter((p) => p.staffId !== id);
        });
        return { ...weekState, assignmentMap: nextMap };
      };
      setCurrent(stripStaff);
      setNext(stripStaff);
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "אירעה שגיאה", "error");
    }
  }

  async function refetchSchedule() {
    try {
      const res = await fetch("/api/schedule");
      if (res.ok) {
        const data = await res.json();
        setCurrent(buildWeekState(data.weeks.current));
        setNext(buildWeekState(data.weeks.next));
      }
    } catch {
      // אם הרענון נכשל, לא קריטי — הנתונים הקיימים נשארים כפי שהם
    }
  }

  async function toggleReady(positionName, ready) {
    try {
      const res = await fetch("/api/schedule/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: week.weekStart, positionName, ready }),
      });
      const data = await res.json();
      if (res.ok) {
        setWeek((prev) => ({ ...prev, readyPositions: data.readyPositions }));
      } else {
        showToast(data.error || "אירעה שגיאה", "error");
      }
    } catch {
      showToast("לא ניתן להתחבר לשרת", "error");
    }
  }

  async function togglePublish() {
    setPublishing(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: week.weekStart, publish: !week.isPublished }),
      });
      const data = await res.json();
      if (res.ok) {
        setWeek((prev) => ({ ...prev, isPublished: data.isPublished }));
        showToast(data.isPublished ? "הסידור פורסם" : "חזרת לעריכה", "success");
      } else {
        showToast(data.error || "אירעה שגיאה", "error");
      }
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#0c2635] text-gray-100 p-4 sm:p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#123244] border border-[#1c3f4f] rounded-2xl p-4 animate-fade-in">
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
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 active:scale-95 ${
                  week.isPublished
                    ? "bg-[#1c3f4f] text-gray-200 hover:bg-[#254d5f]"
                    : "bg-[#90d3d9] text-[#0c2635] hover:bg-[#7cc3ca]"
                }`}
              >
                {publishing ? "..." : week.isPublished ? "חזרה לעריכה" : "פרסם"}
              </button>
            )}
            <button
              onClick={onLogout}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-[#1c3f4f] text-gray-300 hover:bg-[#254d5f] transition active:scale-95"
            >
              יציאה
            </button>
          </div>
        </div>

        <div className="flex gap-2 bg-[#123244] border border-[#1c3f4f] rounded-2xl p-1.5 animate-fade-in">
          <button
            onClick={() => setActiveTab("current")}
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === "current"
                ? "bg-[#90d3d9] text-[#0c2635]"
                : "text-gray-300 hover:bg-[#1c3f4f]"
            }`}
          >
            השבוע הנוכחי
            {current.isPublished && <span className="mr-1 text-[10px] opacity-70">(פורסם)</span>}
          </button>
          <button
            onClick={() => setActiveTab("next")}
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === "next"
                ? "bg-[#90d3d9] text-[#0c2635]"
                : "text-gray-300 hover:bg-[#1c3f4f]"
            }`}
          >
            השבוע הבא
            {next.isPublished && <span className="mr-1 text-[10px] opacity-70">(פורסם)</span>}
          </button>
        </div>

        {week.isPublished && (
          <div className="text-sm text-[#90d3d9] bg-[#90d3d9]/10 border border-[#90d3d9]/30 rounded-lg px-4 py-2 animate-fade-in">
            הסידור פורסם — תצוגה בלבד
          </div>
        )}

        {!week.isPublished && (
          <ReadinessPanel
            isAdmin={isAdmin}
            allowedPositions={allowedPositions}
            readyPositions={week.readyPositions || []}
            onToggleReady={toggleReady}
          />
        )}

        {isAdmin && (
          <StaffManager
            staffList={staffList}
            onAdd={handleAddStaff}
            onDelete={handleDeleteStaff}
            onUpdateEmail={handleUpdateStaffEmail}
            viewPin={initialViewPin}
            confirmDialog={confirmDialog}
            showToast={showToast}
          />
        )}

        {isAdmin && (
          <AccountsManager
            currentUsername={session?.username}
            confirmDialog={confirmDialog}
            showToast={showToast}
          />
        )}

        {(isAdmin || allowedPositions.length > 0) && (
          <RequestsViewer
            isAdmin={isAdmin}
            allowedPositions={allowedPositions}
            showToast={showToast}
            nextWeekStart={next.weekStart}
            onApplied={refetchSchedule}
          />
        )}

        <div key={activeTab} className="overflow-x-auto bg-[#123244] border border-[#1c3f4f] rounded-2xl animate-fade-in">
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
                  assignmentMap={week.assignmentMap}
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

function ReadinessPanel({ isAdmin, allowedPositions, readyPositions, onToggleReady }) {
  const myPositions = isAdmin ? [] : allowedPositions;

  return (
    <div className="bg-[#123244] border border-[#1c3f4f] rounded-2xl p-4 space-y-3 animate-fade-in">
      <h2 className="text-white font-bold text-sm">מוכנות המחלקות לפני הפרסום</h2>

      <div className="flex flex-wrap gap-2">
        {POSITIONS.map((position) => {
          const color = POSITION_COLORS[position];
          const isReady = readyPositions.includes(position);
          return (
            <span
              key={position}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs"
              style={{ backgroundColor: `${color}22`, borderRight: `2px solid ${color}` }}
            >
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              {position}
              <span className={isReady ? "text-[#90d3d9]" : "text-gray-500"}>
                {isReady ? "✅ מוכן" : "⏳ ממתין"}
              </span>
            </span>
          );
        })}
      </div>

      {!isAdmin && myPositions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-[#1c3f4f]">
          {myPositions.map((position) => {
            const isReady = readyPositions.includes(position);
            return (
              <button
                key={position}
                onClick={() => onToggleReady(position, !isReady)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
                  isReady
                    ? "bg-[#1c3f4f] text-gray-200 hover:bg-[#254d5f]"
                    : "bg-[#90d3d9] text-[#0c2635] hover:bg-[#7cc3ca]"
                }`}
              >
                {isReady ? `בטל מוכנות — ${position}` : `אני מוכן — ${position}`}
              </button>
            );
          })}
        </div>
      )}
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
        const color = POSITION_COLORS[position];
        return (
          <tr key={position} className="hover:bg-[#0c2635]/40 transition-colors">
            <td
              className="sticky right-0 bg-[#123244] text-gray-300 font-medium p-3 border-b border-[#1c3f4f]/70 align-top"
              style={{ borderRight: `3px solid ${color}` }}
            >
              <span className="flex items-center gap-2">
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                {position}
              </span>
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
                        className="flex items-center justify-between gap-1 rounded-md px-2 py-1 text-xs animate-slide-up"
                        style={{
                          backgroundColor: `${color}22`,
                          borderRight: `2px solid ${color}`,
                        }}
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
                            className="text-gray-500 hover:text-red-400 leading-none transition"
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
        className="w-full bg-[#0c2635] text-gray-400 text-xs rounded-md border border-[#1c3f4f] focus:border-[#90d3d9] focus:outline-none px-1.5 py-1 transition"
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
    <div className="flex items-center gap-1 animate-fade-in">
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
        className="w-full bg-[#0c2635] text-[#90d3d9] text-xs rounded-md border border-[#90d3d9]/60 focus:border-[#90d3d9] focus:outline-none px-1.5 py-1 transition"
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
        className="text-gray-500 hover:text-red-400 text-xs leading-none transition"
        aria-label="ביטול"
      >
        ×
      </button>
    </div>
  );
}

function StaffManager({ staffList, onAdd, onDelete, onUpdateEmail, viewPin, confirmDialog, showToast }) {
  const [open, setOpen] = useState(false);

  async function handleDelete(s) {
    const ok = await confirmDialog(`למחוק את "${s.name}"?`);
    if (ok) onDelete(s.id);
  }

  return (
    <div className="bg-[#123244] border border-[#1c3f4f] rounded-2xl overflow-hidden animate-fade-in">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-[#0c2635]/30 transition"
      >
        <h2 className="text-white font-bold">ניהול עובדים</h2>
        <span className="text-[#90d3d9] text-sm flex items-center gap-1.5">
          {open ? "סגור" : "פתח"}
          <span className={`inline-block transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </span>
      </button>

      {open && (
        <div className="p-4 pt-0 space-y-4 animate-slide-up">
          <div className="flex justify-end">
            <PinManager currentPin={viewPin} showToast={showToast} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {POSITIONS.map((position) => {
              const color = POSITION_COLORS[position];
              return (
                <div key={position} className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color }}>
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    {position}
                  </h3>
                  <div className="flex flex-wrap gap-1 min-h-[24px]">
                    {staffList
                      .filter((s) => s.position_name === position)
                      .map((s) => (
                        <span
                          key={s.id}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-200"
                          style={{ backgroundColor: `${color}22`, borderRight: `2px solid ${color}` }}
                        >
                          {s.name}
                          <button
                            onClick={() => handleDelete(s)}
                            className="text-gray-500 hover:text-red-400 leading-none transition"
                            aria-label="מחק"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                  <StaffEmailEditor
                    staffList={staffList.filter((s) => s.position_name === position)}
                    onUpdateEmail={onUpdateEmail}
                  />
                  <AddStaffForm position={position} onAdd={onAdd} />
                </div>
              );
            })}
          </div>

          <div className="border-t border-[#1c3f4f] pt-4">
            <h3 className="text-white font-bold mb-3">יצירת משתמש חדש</h3>
            <CreateUserForm showToast={showToast} />
          </div>
        </div>
      )}
    </div>
  );
}

const ROLE_OPTIONS = [
  { key: "kitchen", label: "אחראי מטבח" },
  { key: "bar", label: "אחראי בר" },
  { key: "admin", label: "מנהל" },
];

function AccountsManager({ currentUsername, confirmDialog, showToast }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  async function loadEmployees() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
        setLoaded(true);
      } else {
        setError(data.error || "אירעה שגיאה");
      }
    } catch {
      setError("לא ניתן להתחבר לשרת");
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) loadEmployees();
  }

  async function handleDelete(emp) {
    const ok = await confirmDialog(`למחוק את המשתמש "${emp.display_name}" (${emp.username})?`);
    if (!ok) return;
    setDeletingId(emp.id);
    try {
      const res = await fetch("/api/employees", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: emp.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
        showToast("המשתמש נמחק", "success");
      } else {
        showToast(data.error || "אירעה שגיאה", "error");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-[#123244] border border-[#1c3f4f] rounded-2xl overflow-hidden animate-fade-in">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-[#0c2635]/30 transition"
      >
        <h2 className="text-white font-bold">ניהול חשבונות</h2>
        <span className="text-[#90d3d9] text-sm flex items-center gap-1.5">
          {open ? "סגור" : "פתח"}
          <span className={`inline-block transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </span>
      </button>

      {open && (
        <div className="p-4 pt-0 animate-slide-up">
          {loading && (
            <div className="flex gap-1.5 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#90d3d9] animate-pulse [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#90d3d9] animate-pulse [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#90d3d9] animate-pulse [animation-delay:300ms]" />
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {!loading && !error && employees.length === 0 && (
            <p className="text-gray-500 text-sm">אין חשבונות נוספים</p>
          )}

          {!loading && employees.length > 0 && (
            <div className="space-y-2">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between gap-3 bg-[#0c2635] rounded-lg px-3 py-2"
                >
                  <div className="flex flex-col leading-tight">
                    <span className="text-gray-100 text-sm font-medium">
                      {emp.display_name}{" "}
                      {emp.username === currentUsername && (
                        <span className="text-[#90d3d9] text-xs">(אתה)</span>
                      )}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {emp.username} · {emp.role_label}
                    </span>
                  </div>
                  {emp.username !== currentUsername && (
                    <button
                      onClick={() => handleDelete(emp)}
                      disabled={deletingId === emp.id}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 shrink-0 transition"
                    >
                      {deletingId === emp.id ? "..." : "מחיקה"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RequestsViewer({ isAdmin, allowedPositions, showToast, nextWeekStart, onApplied }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requests, setRequests] = useState([]);
  const [applyingPosition, setApplyingPosition] = useState(null);

  const managedPositions = isAdmin ? POSITIONS : allowedPositions;

  async function loadRequests() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/requests");
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
        setLoaded(true);
      } else {
        setError(data.error || "אירעה שגיאה");
      }
    } catch {
      setError("לא ניתן להתחבר לשרת");
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) loadRequests();
  }

  async function handleApply(positionName) {
    setApplyingPosition(positionName);
    try {
      const res = await fetch("/api/requests/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: nextWeekStart, positionName }),
      });
      const data = await res.json();
      if (res.ok) {
        const parts = [`נוספו ${data.insertedCount} שיבוצים`];
        if (data.conflictsCount > 0) parts.push(`${data.conflictsCount} התנגשויות דולגו`);
        showToast(parts.join(" · "), "success");
        onApplied();
      } else {
        showToast(data.error || "אירעה שגיאה", "error");
      }
    } catch {
      showToast("לא ניתן להתחבר לשרת", "error");
    } finally {
      setApplyingPosition(null);
    }
  }

  const grouped = {};
  SHIFTS.forEach((shift) => {
    grouped[shift] = {};
    DAYS.forEach((day) => {
      grouped[shift][day] = [];
    });
  });
  requests.forEach((r) => {
    if (grouped[r.shift_name] && grouped[r.shift_name][r.day_name]) {
      grouped[r.shift_name][r.day_name].push(r);
    }
  });

  return (
    <div className="bg-[#123244] border border-[#1c3f4f] rounded-2xl overflow-hidden animate-fade-in">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-[#0c2635]/30 transition"
      >
        <h2 className="text-white font-bold">בקשות עובדים לשבוע הבא</h2>
        <span className="text-[#90d3d9] text-sm flex items-center gap-1.5">
          {open ? "סגור" : "פתח"}
          <span className={`inline-block transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </span>
      </button>

      {open && (
        <div className="p-4 pt-0 space-y-4 animate-slide-up">
          {managedPositions.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2 border-b border-[#1c3f4f]">
              {managedPositions.map((position) => {
                const color = POSITION_COLORS[position];
                return (
                  <button
                    key={position}
                    onClick={() => handleApply(position)}
                    disabled={applyingPosition === position}
                    className="text-xs font-semibold rounded-lg px-3 py-1.5 transition active:scale-95 disabled:opacity-50"
                    style={{ backgroundColor: `${color}33`, color, border: `1px solid ${color}66` }}
                  >
                    {applyingPosition === position ? "..." : `החל הצעה — ${position}`}
                  </button>
                );
              })}
            </div>
          )}

          {loading && (
            <div className="flex gap-1.5 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#90d3d9] animate-pulse [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#90d3d9] animate-pulse [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#90d3d9] animate-pulse [animation-delay:300ms]" />
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {!loading && !error && requests.length === 0 && (
            <p className="text-gray-500 text-sm">עדיין לא התקבלו בקשות לשבוע הבא</p>
          )}

          {!loading && requests.length > 0 && (
            <div className="space-y-4">
              {SHIFTS.map((shift) => (
                <div key={shift} className="space-y-2">
                  <h3 className="text-[#90d3d9] text-sm font-bold">{shift}</h3>
                  {DAYS.map((day) => {
                    const dayRequests = grouped[shift][day];
                    if (dayRequests.length === 0) return null;
                    return (
                      <div key={day} className="flex items-start gap-3 text-sm">
                        <span className="text-gray-400 w-14 shrink-0 pt-1">{day}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {dayRequests.map((r) => {
                            const color = POSITION_COLORS[r.staff_members?.position_name] || "#90d3d9";
                            return (
                              <span
                                key={r.id}
                                title={r.note || ""}
                                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                                  r.wants_to_work ? "text-gray-100" : "text-gray-500 line-through"
                                }`}
                                style={{
                                  backgroundColor: `${color}22`,
                                  borderRight: `2px solid ${color}`,
                                }}
                              >
                                {r.wants_to_work ? "✅" : "❌"} {r.staff_members?.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateUserForm({ showToast }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [roleKey, setRoleKey] = useState(ROLE_OPTIONS[0].key);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !displayName.trim()) {
      showToast("יש למלא את כל השדות", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          displayName: displayName.trim(),
          roleKey,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("המשתמש נוצר בהצלחה", "success");
        setUsername("");
        setPassword("");
        setDisplayName("");
        setRoleKey(ROLE_OPTIONS[0].key);
      } else {
        showToast(data.error || "אירעה שגיאה", "error");
      }
    } catch {
      showToast("לא ניתן להתחבר לשרת", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">שם משתמש</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="bg-[#0c2635] text-gray-100 text-sm rounded-md border border-[#1c3f4f] focus:border-[#90d3d9] focus:outline-none px-2 py-1.5 transition"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">סיסמה</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-[#0c2635] text-gray-100 text-sm rounded-md border border-[#1c3f4f] focus:border-[#90d3d9] focus:outline-none px-2 py-1.5 transition"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">שם תצוגה</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="bg-[#0c2635] text-gray-100 text-sm rounded-md border border-[#1c3f4f] focus:border-[#90d3d9] focus:outline-none px-2 py-1.5 transition"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">תפקיד</label>
        <select
          value={roleKey}
          onChange={(e) => setRoleKey(e.target.value)}
          className="bg-[#0c2635] text-gray-100 text-sm rounded-md border border-[#1c3f4f] focus:border-[#90d3d9] focus:outline-none px-2 py-1.5 transition"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="bg-[#90d3d9] hover:bg-[#7cc3ca] disabled:opacity-50 text-[#0c2635] font-bold text-sm rounded-md px-4 py-1.5 transition active:scale-95"
        >
          {saving ? "..." : "יצירת משתמש"}
        </button>
      </div>
    </form>
  );
}

function StaffEmailEditor({ staffList, onUpdateEmail }) {
  const [open, setOpen] = useState(false);

  if (staffList.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] text-gray-500 hover:text-[#90d3d9] transition"
      >
        {open ? "סגור אימיילים" : "ערוך אימיילים"}
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {staffList.map((s) => (
            <StaffEmailRow key={s.id} staff={s} onUpdateEmail={onUpdateEmail} />
          ))}
        </div>
      )}
    </div>
  );
}

function StaffEmailRow({ staff, onUpdateEmail }) {
  const [email, setEmail] = useState(staff.email || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onUpdateEmail(staff.id, email.trim());
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-gray-400 w-16 shrink-0 truncate">{staff.name}</span>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="אימייל"
        className="flex-1 min-w-0 bg-[#0c2635] text-gray-100 text-[10px] rounded border border-[#1c3f4f] focus:border-[#90d3d9] focus:outline-none px-1.5 py-0.5 transition"
      />
      <button
        onClick={save}
        disabled={saving}
        className="shrink-0 bg-[#1c3f4f] hover:bg-[#254d5f] disabled:opacity-50 text-gray-200 text-[10px] rounded px-1.5 py-0.5 transition"
      >
        {saving ? "..." : "שמור"}
      </button>
    </div>
  );
}

function AddStaffForm({ position, onAdd }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) {
          onAdd(name.trim(), position, email.trim());
          setName("");
          setEmail("");
        }
      }}
      className="flex flex-col gap-1"
    >
      <div className="flex gap-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם חדש"
          className="flex-1 min-w-0 bg-[#0c2635] text-gray-100 text-xs rounded-md border border-[#1c3f4f] focus:border-[#90d3d9] focus:outline-none px-2 py-1 transition"
        />
        <button
          type="submit"
          className="shrink-0 bg-[#90d3d9] hover:bg-[#7cc3ca] text-[#0c2635] font-bold text-xs rounded-md px-2.5 transition active:scale-95"
        >
          +
        </button>
      </div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="אימייל (לא חובה כרגע)"
        className="w-full bg-[#0c2635] text-gray-100 text-xs rounded-md border border-[#1c3f4f] focus:border-[#90d3d9] focus:outline-none px-2 py-1 transition"
      />
    </form>
  );
}

function PinManager({ currentPin, showToast }) {
  const [pin, setPin] = useState(currentPin || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!/^\d{4}$/.test(pin)) {
      showToast("חייב 4 ספרות", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewPin: pin }),
      });
      showToast(res.ok ? "נשמר" : "שגיאה בשמירה", res.ok ? "success" : "error");
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
        className="w-16 bg-[#0c2635] text-gray-100 text-center rounded-md border border-[#1c3f4f] px-2 py-1 transition"
      />
      <button
        onClick={save}
        disabled={saving}
        className="bg-[#1c3f4f] hover:bg-[#254d5f] disabled:opacity-50 text-gray-200 rounded-md px-3 py-1 transition active:scale-95"
      >
        {saving ? "..." : "שמור"}
      </button>
    </div>
  );
}
