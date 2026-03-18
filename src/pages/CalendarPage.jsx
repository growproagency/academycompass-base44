import React, { useState, useMemo } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { useAuth } from "@/components/lib/SupabaseAuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  addMonths,
  isSameDay,
  isSameMonth,
  parseISO,
  isPast,
  isToday,
} from "date-fns";

const PRIORITY_DOT_COLOR = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#3B82F6",
};

const STATUS_CHIP = {
  todo: { bg: "#F1F5F9", color: "#64748B" },
  in_progress: { bg: "#DBEAFE", color: "#2563EB" },
  done: { bg: "#DCFCE7", color: "#16A34A" },
};

export default function CalendarPage() {
  const [view, setView] = useState("weekly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const { profile } = useAuth();

  const isAdmin = profile?.role?.toLowerCase() === 'admin';

  console.log('📅 Calendar: user role:', profile?.role, '| isAdmin:', isAdmin);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["calendar-tasks", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      // Fetch tasks with due dates — members only see their own
      let query = supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, assigned_to')
        .eq('organization_id', profile.organization_id)
        .not('due_date', 'is', null);

      if (!isAdmin) {
        query = query.eq('assigned_to', profile.id);
      }

      const { data: tasksData, error } = await query;
      if (error) {
        console.error('❌ Calendar: Tasks query error:', error);
        return [];
      }
      console.log('✅ Calendar: Tasks fetched:', tasksData?.length || 0);

      // For admins, resolve assignee names
      if (isAdmin && tasksData && tasksData.length > 0) {
        const assigneeIds = [...new Set(tasksData.map(t => t.assigned_to).filter(Boolean))];
        console.log('📅 Calendar: Fetching assignees for ids:', assigneeIds);

        if (assigneeIds.length > 0) {
          const { data: profiles, error: pErr } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', assigneeIds);
          if (pErr) {
            console.error('❌ Calendar: Assignee fetch error:', pErr);
          } else {
            const profileMap = new Map(profiles.map(p => [p.id, p.full_name]));
            const result = tasksData.map(t => ({
              ...t,
              assignee_name: t.assigned_to ? (profileMap.get(t.assigned_to) || 'Unknown') : 'Unassigned',
            }));
            console.log('📅 Calendar: Sample task with assignee:', result[0]);
            return result;
          }
        }
        // No assignees — still mark unassigned
        return tasksData.map(t => ({ ...t, assignee_name: 'Unassigned' }));
      }

      return tasksData || [];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["calendar-milestones", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('milestones')
        .select('id, title, due_date, rock_id')
        .eq('organization_id', profile.organization_id);
      if (error) {
        console.error('❌ Calendar: Milestones query error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: rocks = [] } = useQuery({
    queryKey: ["rocks", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('rocks')
        .select('id, name')
        .eq('organization_id', profile.organization_id);
      if (error) return [];
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const rockMap = useMemo(() => new Map(rocks.map((r) => [r.id, r.name])), [rocks]);

  const navigate = (dir) => {
    if (view === "weekly") setCurrentDate((d) => addWeeks(d, dir));
    else setCurrentDate((d) => addMonths(d, dir));
  };

  const days = useMemo(() => {
    if (view === "weekly") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const monthDays = eachDayOfInterval({ start, end });
      // Pad beginning
      const firstDayOfWeek = start.getDay() || 7;
      const paddingBefore = firstDayOfWeek - 1;
      const startPad = startOfWeek(start, { weekStartsOn: 1 });
      const allDays = eachDayOfInterval({ start: startPad, end });
      // Pad end to complete week
      const endPad = endOfWeek(end, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: startPad, end: endPad });
    }
  }, [currentDate, view]);

  const getEventsForDay = (day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayTasks = tasks.filter((t) => t.due_date === dayStr);
    const dayMilestones = milestones.filter((m) => m.due_date === dayStr);
    return { tasks: dayTasks, milestones: dayMilestones };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6" style={{ background: "#ffffff", fontFamily: "'Inter', sans-serif" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1E293B" }}>Calendar</h1>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>To-Dos and milestones timeline</p>
        </div>
        {/* View toggle */}
        <div className="flex" style={{ border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
          {["weekly", "monthly"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "6px 16px",
                fontSize: 13,
                fontWeight: 600,
                background: view === v ? "#22C55E" : "#ffffff",
                color: view === v ? "#ffffff" : "#64748B",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          style={{ padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#ffffff", cursor: "pointer", color: "#64748B" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#22C55E"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#E2E8F0"}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1E293B" }}>
          {view === "weekly"
            ? `${format(days[0], "MMM d")} — ${format(days[days.length - 1], "MMM d, yyyy")}`
            : format(currentDate, "MMMM yyyy")}
        </h2>
        <button
          onClick={() => navigate(1)}
          style={{ padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#ffffff", cursor: "pointer", color: "#64748B" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#22C55E"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#E2E8F0"}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {view === "weekly" ? (
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const events = getEventsForDay(day);
            const today = isToday(day);
            return (
              <div key={day.toISOString()} style={{ minHeight: 120 }}>
                <div className="text-center mb-2">
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#64748B", letterSpacing: "0.06em" }}>{format(day, "EEE")}</div>
                  <div
                    className="flex items-center justify-center mx-auto"
                    style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: today ? "#22C55E" : "transparent",
                      color: today ? "#ffffff" : "#1E293B",
                      fontSize: 13, fontWeight: today ? 700 : 500,
                    }}
                  >
                    {format(day, "d")}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {events.tasks.map((t) => {
                    const overdue = t.status !== 'done' && isPast(parseISO(t.due_date));
                    const chip = STATUS_CHIP[t.status] || STATUS_CHIP.todo;
                    return (
                      <div
                        key={t.id}
                        style={{
                          background: overdue ? "#FEE2E2" : "#F8FAFC",
                          border: `1px solid ${overdue ? "#FECACA" : "#E2E8F0"}`,
                          borderRadius: 6,
                          padding: "3px 6px",
                          fontSize: 10,
                          cursor: "pointer",
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_DOT_COLOR[t.priority], flexShrink: 0 }} />
                          <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: overdue ? "#EF4444" : "#1E293B" }}>{t.title}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 pl-2.5">
                          <span style={{ fontSize: 9, fontWeight: 600, background: chip.bg, color: chip.color, borderRadius: 4, padding: "1px 5px" }}>
                            {t.status === 'in_progress' ? 'In Progress' : t.status === 'done' ? 'Done' : 'To Do'}
                          </span>
                          {isAdmin && <span style={{ fontSize: 9, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.assignee_name || 'Unassigned'}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {events.milestones.map((m) => (
                    <div key={m.id} style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 6, padding: "3px 6px", fontSize: 10, color: "#7C3AED" }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{m.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-7 mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, textTransform: "uppercase", color: "#64748B", fontWeight: 600, letterSpacing: "0.06em", padding: "8px 0" }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7" style={{ border: "1px solid #F1F5F9", borderRadius: 12, overflow: "hidden" }}>
            {days.map((day, idx) => {
              const events = getEventsForDay(day);
              const today = isToday(day);
              const inMonth = isSameMonth(day, currentDate);
              return (
                <div
                  key={day.toISOString()}
                  style={{
                    minHeight: 80,
                    padding: 6,
                    background: "#ffffff",
                    borderRight: (idx + 1) % 7 !== 0 ? "1px solid #F1F5F9" : "none",
                    borderBottom: "1px solid #F1F5F9",
                    opacity: inMonth ? 1 : 0.35,
                  }}
                >
                  <div style={{ marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: today ? 700 : 500,
                        background: today ? "#22C55E" : "transparent",
                        color: today ? "#ffffff" : "#1E293B",
                        borderRadius: "50%",
                        padding: today ? "2px 6px" : "0",
                        display: "inline-block",
                      }}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {events.tasks.slice(0, 3).map((t) => {
                      const overdue = t.status !== 'done' && isPast(parseISO(t.due_date));
                      const chip = STATUS_CHIP[t.status] || STATUS_CHIP.todo;
                      return (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: PRIORITY_DOT_COLOR[t.priority], flexShrink: 0 }} />
                          <span style={{ fontSize: 9, fontWeight: 600, background: chip.bg, color: overdue ? "#EF4444" : chip.color, borderRadius: 3, padding: "1px 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                            {t.status === 'done' ? 'Done' : t.status === 'in_progress' ? 'In Prog' : 'To Do'}
                          </span>
                          {isAdmin && t.assignee_name && <span style={{ fontSize: 8, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.assignee_name}</span>}
                        </div>
                      );
                    })}
                    {events.tasks.length > 3 && (
                      <span style={{ fontSize: 9, color: "#94A3B8" }}>+{events.tasks.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}