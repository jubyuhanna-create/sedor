"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScheduleTable from "../components/ScheduleTable";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [isPublished, setIsPublished] = useState(false);
  const [viewPin, setViewPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSchedule();
  }, []);

  async function loadSchedule() {
    setLoading(true);
    try {
      const res = await fetch("/api/schedule");
      if (res.status === 401) {
        router.push("/gate");
        return;
      }
      const data = await res.json();
      setSession(data.session);
      setAssignments(data.assignments || []);
      setStaff(data.staff || []);
      setIsPublished(data.isPublished);
      setViewPin(data.viewPin || "");
    } catch {
      setError("تعذر تحميل الجدول");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/gate");
  }

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-950 text-gray-400 flex items-center justify-center">
        جاري التحميل...
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-950 text-red-400 flex items-center justify-center">
        {error}
      </div>
    );
  }

  return (
    <ScheduleTable
      session={session}
      initialAssignments={assignments}
      initialStaff={staff}
      initialPublished={isPublished}
      initialViewPin={viewPin}
      onLogout={handleLogout}
    />
  );
}
