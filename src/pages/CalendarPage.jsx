import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
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

export default function CalendarPage() {
  const [view, setView] = useState("weekly");
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["calendar-tasks"],
    queryFn: () => base44.entities.Task.filter({ archived_at: null }),
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["calendar-milestones"],
    queryFn: () => base44.entities.Milestone.list(),
  });

  const { data: rocks = [] } = useQuery({
    queryKey: ["rocks"],
    queryFn: () => base44.entities.Rock.list(),
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
                  {events.tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-1 px-1.5 py-1 bg-card rounded border border-border/40 text-[10px]">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}
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
                    {events.tasks.slice(0, 3).map((t) => (
                      <div key={t.id} className="flex items-center gap-0.5 text-[9px] truncate">
                        <div className={`w-1 h-1 rounded-full shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
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