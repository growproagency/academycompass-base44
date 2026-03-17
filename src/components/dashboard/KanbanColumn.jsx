import React from "react";
import { Circle, Timer, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import TaskCard from "@/components/tasks/TaskCard";

const COLUMN_CONFIG = {
  todo: { label: "To Do", icon: Circle, badgeBg: "#F1F5F9", badgeColor: "#64748B" },
  in_progress: { label: "In Progress", icon: Timer, badgeBg: "#DBEAFE", badgeColor: "#2563EB" },
  done: { label: "Done", icon: CheckCircle2, badgeBg: "#DCFCE7", badgeColor: "#16A34A" },
};

export default function KanbanColumn({ status, tasks, onTaskClick, onStatusChange, onCreateClick, rockMap }) {
  const config = COLUMN_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex flex-col min-w-[280px] flex-1">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{config.label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, background: config.badgeBg, color: config.badgeColor, borderRadius: 20, padding: "1px 8px" }}>
            {tasks.length}
          </span>
        </div>
        {status === "todo" && onCreateClick && (
          <button
            onClick={onCreateClick}
            style={{ padding: "2px 6px", border: "1px solid #E2E8F0", borderRadius: 6, background: "#ffffff", cursor: "pointer", color: "#64748B" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#22C55E"; e.currentTarget.style.color = "#22C55E"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#64748B"; }}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tasks */}
      <div className="flex-1 space-y-2 min-h-[100px]">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            rockName={task.rock_id ? rockMap?.get(task.rock_id) : null}
            onClick={() => onTaskClick?.(task)}
            onStatusChange={onStatusChange}
          />
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20" style={{ border: "1.5px dashed #E2E8F0", borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: "#94A3B8" }}>No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}