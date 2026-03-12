import React from "react";
import { Circle, Timer, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import TaskCard from "@/components/tasks/TaskCard";

const COLUMN_CONFIG = {
  todo: { label: "To Do", icon: Circle, color: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: Timer, color: "text-blue-400" },
  done: { label: "Done", icon: CheckCircle2, color: "text-emerald-400" },
};

export default function KanbanColumn({ status, tasks, onTaskClick, onStatusChange, onCreateClick, rockMap }) {
  const config = COLUMN_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex flex-col min-w-[280px] flex-1">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.color}`} />
          <span className="text-sm font-semibold">{config.label}</span>
          <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
            {tasks.length}
          </span>
        </div>
        {status === "todo" && onCreateClick && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-primary"
            onClick={onCreateClick}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
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
          <div className="flex items-center justify-center h-20 border border-dashed border-border/50 rounded-lg">
            <p className="text-xs text-muted-foreground">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}