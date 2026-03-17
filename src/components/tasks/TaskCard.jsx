import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, Mountain, Repeat2 } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";

const PRIORITY_BADGE = {
  high: { bg: "#FEE2E2", color: "#DC2626" },
  medium: { bg: "#FEF3C7", color: "#D97706" },
  low: { bg: "#DBEAFE", color: "#2563EB" },
};

export default function TaskCard({ task, rockName, onClick, onStatusChange }) {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== "done";
  const subtasksArray = Array.isArray(task.subtasks) ? task.subtasks : [];
  const subtasksDone = subtasksArray.filter((s) => s.completed).length;
  const subtasksTotal = subtasksArray.length;
  const priority = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium;

  return (
    <div
      className="task-card cursor-pointer"
      style={{
        background: "#ffffff",
        border: "1px solid #E2E8F0",
        borderRadius: 10,
        padding: "12px 14px",
      }}
      onClick={onClick}
    >
      <div className="flex items-start gap-2.5">
        {/* Status toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const next = { todo: "in_progress", in_progress: "done", done: null };
            if (!next[task.status]) return;
            onStatusChange?.(task, next[task.status]);
          }}
          className="mt-0.5 shrink-0 flex items-center justify-center"
          style={{
            width: 16, height: 16, borderRadius: "50%",
            border: `2px solid ${task.status === "done" ? "#22C55E" : task.status === "in_progress" ? "#3B82F6" : "#CBD5E1"}`,
            background: task.status === "done" ? "rgba(34,197,94,0.15)" : task.status === "in_progress" ? "rgba(59,130,246,0.15)" : "transparent",
          }}
        >
          {task.status === "done" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />}
          {task.status === "in_progress" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6" }} />}
        </button>

        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 500, color: task.status === "done" ? "#94A3B8" : "#1E293B", textDecoration: task.status === "done" ? "line-through" : "none", lineHeight: "1.4" }}>
            {task.title}
          </p>

          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            <span style={{ fontSize: 10, fontWeight: 600, background: priority.bg, color: priority.color, borderRadius: 4, padding: "1px 6px" }}>
              {task.priority}
            </span>

            {rockName && (
              <span style={{ fontSize: 10, background: "#F0FDF4", color: "#16A34A", borderRadius: 4, padding: "1px 6px", display: "inline-flex", alignItems: "center", gap: 2 }}>
                <Mountain className="w-2.5 h-2.5" />{rockName}
              </span>
            )}

            {task.due_date && (
              <span style={{ fontSize: 10, background: isOverdue ? "#FEE2E2" : "#F1F5F9", color: isOverdue ? "#EF4444" : "#64748B", borderRadius: 4, padding: "1px 6px", display: "inline-flex", alignItems: "center", gap: 2 }}>
                {isOverdue ? <AlertCircle className="w-2 h-2" /> : <Calendar className="w-2 h-2" />}
                {format(parseISO(task.due_date), "MMM d")}
              </span>
            )}

            <span style={{ fontSize: 10, background: "#F1F5F9", color: "#64748B", borderRadius: 4, padding: "1px 6px" }}>
              {task.assignee?.full_name || "Unassigned"}
            </span>

            {task.repeat && task.repeat !== "none" && (
              <span style={{ fontSize: 10, background: "#F5F3FF", color: "#7C3AED", borderRadius: 4, padding: "1px 6px", display: "inline-flex", alignItems: "center", gap: 2 }}>
                <Repeat2 className="w-2 h-2" />{task.repeat}
              </span>
            )}

            {subtasksTotal > 0 && (
              <span style={{ fontSize: 10, color: "#94A3B8" }}>
                {subtasksDone}/{subtasksTotal}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}