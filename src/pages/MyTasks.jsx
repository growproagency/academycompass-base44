import React, { useState, useMemo } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { useAuth } from "@/components/lib/SupabaseAuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// Note: task create/update/subtask sync is handled inside TaskDialog component
import {
  CheckSquare,
  AlertCircle,
  Calendar,
  Loader2,
  Mountain,
  Filter,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isPast, parseISO, format } from "date-fns";
import StatCard from "@/components/dashboard/StatCard";
import TaskDialog from "@/components/tasks/TaskDialog";
import { toast } from "sonner";

const PRIORITY_BADGE = {
  high: { bg: "#FEE2E2", color: "#DC2626" },
  medium: { bg: "#FEF3C7", color: "#D97706" },
  low: { bg: "#DBEAFE", color: "#2563EB" },
};

const STATUS_BADGE_STYLE = {
  todo: { bg: "#F1F5F9", color: "#64748B" },
  in_progress: { bg: "#DBEAFE", color: "#2563EB" },
  done: { bg: "#DCFCE7", color: "#16A34A" },
};

const STATUS_LEFT_BORDER = {
  todo: "#CBD5E1",
  in_progress: "#3B82F6",
  done: "#22C55E",
};

const STATUS_LABELS = { todo: "To Do", in_progress: "In Progress", done: "Done" };

export default function MyTasks() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [editTask, setEditTask] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  console.log('🔍 MyTasks auth state:', {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    hasProfile: !!profile,
    organizationId: profile?.organization_id
  });

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ["my-tasks", profile?.organization_id, profile?.id],
    queryFn: async () => {
      if (!profile?.organization_id || !profile?.id) {
        console.log('⚠️ MyTasks: Cannot fetch tasks - missing organization_id or profile.id');
        return [];
      }
      console.log('📡 MyTasks: Fetching tasks for:', { 
        organizationId: profile.organization_id, 
        userEmail: user.email 
      });
      console.log('👤 MyTasks: User role:', profile?.role, '| profile.id:', profile?.id);

      // Step 1: Fetch tasks assigned to the current user only (personal view)
      let { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, organization_id, created_by, title, description, status, priority, due_date, created_at, assigned_to, archived_at')
        .eq('organization_id', profile.organization_id)
        .eq('assigned_to', profile.id);

      if (tasksError) {
        console.warn('⚠️ MyTasks: Query with archived_at failed, retrying without it:', tasksError.message);
        const fallback = await supabase
          .from('tasks')
          .select('id, organization_id, created_by, title, description, status, priority, due_date, created_at, assigned_to')
          .eq('organization_id', profile.organization_id)
          .eq('assigned_to', profile.id);
        tasksData = fallback.data;
        if (fallback.error) {
          console.error('❌ MyTasks: Fallback query also failed:', fallback.error);
          return [];
        }
      }

      console.log('✅ MyTasks: Raw tasks fetched (assigned to me):', tasksData?.length || 0);
      console.log('📊 MyTasks: Task statuses:', tasksData?.map(t => t.status));

      const activeTasksData = tasksData.filter(t => !t.archived_at);
      console.log('🗄️ MyTasks: Active tasks:', activeTasksData.length, '| Total fetched:', tasksData.length);
      if (!activeTasksData || activeTasksData.length === 0) return [];

      // Step 2: Batch fetch assignees
      const assigneeIds = [...new Set(activeTasksData.map(t => t.assigned_to).filter(Boolean))];
      const assigneesMap = new Map();
      if (assigneeIds.length > 0) {
        const { data: assigneesData, error: assigneesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', assigneeIds);
        if (assigneesError) {
          console.error('❌ MyTasks: Assignees query error:', assigneesError);
        } else {
          console.log('✅ MyTasks: Assignees fetched:', assigneesData?.length || 0);
          assigneesData?.forEach(a => assigneesMap.set(a.id, a));
        }
      }

      // Step 3: Batch fetch subtasks (only real public.subtasks columns)
      const taskIds = activeTasksData.map(t => t.id);
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('subtasks')
        .select('id, task_id, title, completed')
        .in('task_id', taskIds);
      if (subtasksError) {
        console.error('❌ MyTasks: Subtasks query error:', subtasksError);
      } else {
        console.log('✅ MyTasks: Subtasks fetched:', subtasksData?.length || 0);
      }

      // Step 4: Group subtasks by task_id
      const subtasksByTaskId = new Map();
      subtasksData?.forEach(st => {
        if (!subtasksByTaskId.has(st.task_id)) subtasksByTaskId.set(st.task_id, []);
        subtasksByTaskId.get(st.task_id).push(st);
      });

      // Step 5: Combine
      const result = activeTasksData.map(task => ({
        ...task,
        assignee: task.assigned_to ? assigneesMap.get(task.assigned_to) || null : null,
        subtasks: subtasksByTaskId.get(task.id) || [],
      }));

      console.log('✅ MyTasks: Final combined tasks:', result.length);
      return result;
    },
    enabled: !!profile?.organization_id && !!profile?.id,
  });

  const { data: rocks = [] } = useQuery({
    queryKey: ["rocks", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('rocks')
        .select('*')
        .eq('organization_id', profile.organization_id);
      if (error) {
        console.error('❌ Rocks query error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile.organization_id);
      if (error) {
        console.error('❌ Users query error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, data: taskData }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', id)
        .select();
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    },
  });

  const rockMap = useMemo(() => new Map(rocks.map((r) => [r.id, r.name])), [rocks]);

  const filtered = useMemo(() => {
    return allTasks.filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      return true;
    });
  }, [allTasks, filterStatus, filterPriority]);

  const stats = useMemo(() => ({
    total: allTasks.length,
    overdue: allTasks.filter((t) => t.due_date && isPast(parseISO(t.due_date)) && t.status !== "done").length,
    done: allTasks.filter((t) => t.status === "done").length,
  }), [allTasks]);

  const handleStatusCycle = (task) => {
    const next = { todo: "in_progress", in_progress: "done", done: "todo" };
    updateTask.mutate({ id: task.id, data: { status: next[task.status] } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6" style={{ background: "#ffffff", fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1E293B" }}>My To-Dos</h1>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Tasks assigned to you</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 transition-colors"
          style={{ background: "#22C55E", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = "#16A34A"}
          onMouseLeave={e => e.currentTarget.style.background = "#22C55E"}
        >
          <Plus className="w-4 h-4" /> New To-Do
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: stats.total, icon: CheckSquare, iconColor: "#22C55E" },
          { label: "Overdue", value: stats.overdue, icon: AlertCircle, iconColor: "#EF4444" },
          { label: "Completed", value: stats.done, icon: CheckSquare, iconColor: "#22C55E" },
        ].map(({ label, value, icon: Icon, iconColor }) => (
          <div key={label} style={{ background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: 32, fontWeight: 700, color: "#1E293B", lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{label}</p>
              </div>
              <Icon className="w-6 h-6" style={{ color: iconColor }} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4" style={{ color: "#64748B" }} />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-8 text-xs" style={{ border: "1px solid #E2E8F0", borderRadius: 8 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px] h-8 text-xs" style={{ border: "1px solid #E2E8F0", borderRadius: 8 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.map((task) => {
          const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== "done";
          const statusStyle = STATUS_BADGE_STYLE[task.status] || STATUS_BADGE_STYLE.todo;
          const priorityStyle = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium;
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 cursor-pointer transition-all"
              style={{
                background: "#ffffff",
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                padding: "12px 16px",
                borderLeft: `3px solid ${STATUS_LEFT_BORDER[task.status] || "#CBD5E1"}`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
              onClick={() => setEditTask(task)}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"}
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusCycle(task); }}
                className="shrink-0 flex items-center justify-center transition-colors"
                style={{
                  width: 20, height: 20, borderRadius: "50%",
                  border: `2px solid ${task.status === "done" ? "#22C55E" : task.status === "in_progress" ? "#3B82F6" : "#CBD5E1"}`,
                  background: task.status === "done" ? "rgba(34,197,94,0.15)" : task.status === "in_progress" ? "rgba(59,130,246,0.15)" : "transparent",
                }}
              >
                {task.status === "done" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }} />}
                {task.status === "in_progress" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B82F6" }} />}
              </button>

              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 500, color: task.status === "done" ? "#94A3B8" : "#1E293B", textDecoration: task.status === "done" ? "line-through" : "none" }}>
                  {task.title}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span style={{ fontSize: 11, fontWeight: 600, background: priorityStyle.bg, color: priorityStyle.color, borderRadius: 6, padding: "2px 8px" }}>
                    {task.priority}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, background: statusStyle.bg, color: statusStyle.color, borderRadius: 6, padding: "2px 8px" }}>
                    {STATUS_LABELS[task.status]}
                  </span>
                  {task.rock_id && rockMap.get(task.rock_id) && (
                    <span style={{ fontSize: 11, background: "#F0FDF4", color: "#16A34A", borderRadius: 6, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <Mountain className="w-2.5 h-2.5" />{rockMap.get(task.rock_id)}
                    </span>
                  )}
                  {task.due_date && (
                    <span style={{ fontSize: 11, background: isOverdue ? "#FEE2E2" : "#F1F5F9", color: isOverdue ? "#EF4444" : "#64748B", borderRadius: 6, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 3 }}>
                      {isOverdue ? <AlertCircle className="w-2.5 h-2.5" /> : <Calendar className="w-2.5 h-2.5" />}
                      {format(parseISO(task.due_date), "MMM d")}
                    </span>
                  )}
                  <span style={{ fontSize: 11, background: "#F1F5F9", color: "#64748B", borderRadius: 6, padding: "2px 8px" }}>
                    {task.assignee?.full_name || "Unassigned"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center text-center py-12" style={{ border: "1px solid #E2E8F0", borderRadius: 12, background: "#F8FAFC" }}>
            <CheckSquare className="w-8 h-8 mb-2" style={{ color: "#CBD5E1" }} />
            <p style={{ fontSize: 14, color: "#64748B" }}>No To-Dos found</p>
          </div>
        )}
      </div>

      <TaskDialog
        open={!!editTask}
        onOpenChange={(v) => !v && setEditTask(null)}
        task={editTask}
        rocks={rocks}
        users={users}
        user={user}
        profile={profile}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
          setEditTask(null);
        }}
      />

      <TaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        rocks={rocks}
        users={users}
        user={user}
        profile={profile}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
          setCreateOpen(false);
        }}
      />
    </div>
  );
}