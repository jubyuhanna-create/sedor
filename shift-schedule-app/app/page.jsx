"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScheduleTable from "../components/ScheduleTable";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [isPublished, setIsPublished] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSchedule();
  }, []);

  async function loadSchedule() {
    setLoading(true);
    try {
      const res = await fetch("/api/schedule");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setSession(data.session);
      setEntries(data.entries || []);
      setIsPublished(data.isPublished);
    } catch {
      setError("تعذر تحميل الجدول");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
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
      initialEntries={entries}
      initialPublished={isPublished}
      onLogout={handleLogout}
      onReload={loadSchedule}
    />
  );
}
