import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, Mountain } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";

const PRIORITY_STYLES = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function TaskCard({ task, rockName, onClick, onStatusChange }) {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== "done";
  const subtasksDone = task.subtasks?.filter((s) => s.completed).length || 0;
  const subtasksTotal = task.subtasks?.length || 0;

  return (
    <Card
      className="p-3 bg-card border-border/40 hover:border-border/80 cursor-pointer transition-all duration-200 hover:shadow-md group"
      onClick={onClick}
    >
      <div className="flex items-start gap-2.5">
        {/* Status dot */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const next = { todo: "in_progress", in_progress: "done", done: "todo" };
            onStatusChange?.(task, next[task.status]);
          }}
          className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
            task.status === "done"
              ? "border-emerald-400 bg-emerald-400/20"
              : task.status === "in_progress"
              ? "border-blue-400 bg-blue-400/20"
              : "border-muted-foreground/30 hover:border-primary"
          }`}
        >
          {task.status === "done" && (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
          {task.status === "in_progress" && (
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-tight ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${PRIORITY_STYLES[task.priority]}`}>
              {task.priority}
            </Badge>

            {rockName && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-primary/5 text-primary/80 border-primary/20">
                <Mountain className="w-2.5 h-2.5 mr-0.5" />
                {rockName}
              </Badge>
            )}

            {task.due_date && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-5 ${
                  isOverdue ? "bg-red-500/10 text-red-400 border-red-500/20" : "text-muted-foreground"
                }`}
              >
                {isOverdue ? <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> : <Calendar className="w-2.5 h-2.5 mr-0.5" />}
                {format(parseISO(task.due_date), "MMM d")}
              </Badge>
            )}

            {task.assignee_email ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground">
                {task.assignee_email.split('@')[0]}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground/60">
                Unassigned
              </Badge>
            )}

            {subtasksTotal > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {subtasksDone}/{subtasksTotal}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}