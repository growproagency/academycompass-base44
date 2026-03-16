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

const PRIORITY_DOT = {
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-blue-400",
};

const STATUS_BADGE = {
  todo: "bg-slate-500/20 text-slate-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  done: "bg-emerald-500/20 text-emerald-400",
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

      // Fetch tasks with due dates
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, assigned_to')
        .eq('organization_id', profile.organization_id)
        .not('due_date', 'is', null);
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
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">To-Dos and milestones timeline</p>
        </div>
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="weekly" className="text-xs">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {view === "weekly"
            ? `${format(days[0], "MMM d")} — ${format(days[days.length - 1], "MMM d, yyyy")}`
            : format(currentDate, "MMMM yyyy")}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {view === "weekly" ? (
        /* Weekly View */
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const events = getEventsForDay(day);
            const today = isToday(day);
            return (
              <div key={day.toISOString()} className="min-h-[120px]">
                <div className={`text-center text-xs font-medium mb-2 ${today ? "text-primary" : "text-muted-foreground"}`}>
                  <div className="text-[10px] uppercase">{format(day, "EEE")}</div>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto ${today ? "bg-primary text-primary-foreground" : ""}`}>
                    {format(day, "d")}
                  </div>
                </div>
                <div className="space-y-1">
                  {events.tasks.map((t) => {
                    const overdue = t.status !== 'done' && isPast(parseISO(t.due_date));
                    return (
                      <div key={t.id} className={`flex flex-col gap-0.5 px-1.5 py-1 rounded border text-[10px] cursor-pointer hover:opacity-80 transition-opacity ${overdue ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-card border-border/40'}`}>
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                          <span className="truncate font-medium">{t.title}</span>
                        </div>
                        {isAdmin && (
                          <span className="truncate text-muted-foreground pl-2.5">{t.assignee_name || 'Unassigned'}</span>
                        )}
                      </div>
                    );
                  })}
                  {events.milestones.map((m) => (
                    <div key={m.id} className="flex items-center gap-1 px-1.5 py-1 bg-violet-500/10 rounded border border-violet-500/20 text-[10px] text-violet-400">
                      <span className="truncate">{m.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Monthly View */
        <div>
          <div className="grid grid-cols-7 gap-px mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="text-center text-[10px] uppercase text-muted-foreground font-medium py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border/30 rounded-lg overflow-hidden">
            {days.map((day) => {
              const events = getEventsForDay(day);
              const today = isToday(day);
              const inMonth = isSameMonth(day, currentDate);
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] p-1.5 bg-card ${!inMonth ? "opacity-30" : ""}`}
                >
                  <div className={`text-[11px] font-medium mb-1 ${today ? "text-primary" : "text-muted-foreground"}`}>
                    <span className={`${today ? "bg-primary text-primary-foreground rounded-full px-1.5 py-0.5" : ""}`}>
                      {format(day, "d")}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {events.tasks.slice(0, 3).map((t) => {
                      const overdue = t.status !== 'done' && isPast(parseISO(t.due_date));
                      return (
                        <div key={t.id} className={`flex flex-col gap-0 text-[9px] cursor-pointer hover:opacity-80 ${overdue ? 'text-red-400' : ''}`}>
                          <div className="flex items-center gap-0.5">
                            <div className={`w-1 h-1 rounded-full shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                            <span className="truncate">{t.title}</span>
                          </div>
                          {isAdmin && t.assignee_name && (
                            <span className="truncate text-muted-foreground pl-1.5">{t.assignee_name}</span>
                          )}
                        </div>
                      );
                    })}
                    {events.tasks.length > 3 && (
                      <span className="text-[9px] text-muted-foreground">+{events.tasks.length - 3} more</span>
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