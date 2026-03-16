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

const PRIORITY_STYLES = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const STATUS_STYLES = {
  todo: "bg-secondary text-muted-foreground",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  done: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
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
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, organization_id, created_by, title, description, status, priority, due_date, created_at, assigned_to, archived_at')
        .eq('organization_id', profile.organization_id)
        .eq('assigned_to', profile.id);

      if (tasksError) {
        console.error('❌ MyTasks: Tasks query error:', tasksError);
        console.error('🔍 MyTasks: Error details:', { message: tasksError.message, code: tasksError.code, hint: tasksError.hint });
        return [];
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
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My To-Dos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tasks you created or are assigned to</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New To-Do
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={stats.total} icon={CheckSquare} />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertCircle} color="text-red-400" />
        <StatCard label="Completed" value={stats.done} icon={CheckSquare} color="text-emerald-400" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
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
          return (
            <Card
              key={task.id}
              className="p-3 flex items-center gap-3 hover:border-border/80 transition-all cursor-pointer group"
              onClick={() => setEditTask(task)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusCycle(task); }}
                className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                  task.status === "done" ? "border-emerald-400 bg-emerald-400/20"
                  : task.status === "in_progress" ? "border-blue-400 bg-blue-400/20"
                  : "border-muted-foreground/30 hover:border-primary"
                }`}
              >
                {task.status === "done" && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                {task.status === "in_progress" && <div className="w-2 h-2 rounded-full bg-blue-400" />}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${PRIORITY_STYLES[task.priority]}`}>
                    {task.priority}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${STATUS_STYLES[task.status]}`}>
                    {STATUS_LABELS[task.status]}
                  </Badge>
                  {task.rock_id && rockMap.get(task.rock_id) && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-primary/5 text-primary/80 border-primary/20">
                      <Mountain className="w-2.5 h-2.5 mr-0.5" />{rockMap.get(task.rock_id)}
                    </Badge>
                  )}
                  {task.due_date && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${isOverdue ? "bg-red-500/10 text-red-400 border-red-500/20" : ""}`}>
                      {isOverdue ? <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> : <Calendar className="w-2.5 h-2.5 mr-0.5" />}
                      {format(parseISO(task.due_date), "MMM d")}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground">
                    {task.assignee?.full_name || "Unassigned"}
                  </Badge>
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="p-8 text-center">
            <CheckSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No To-Dos found</p>
          </Card>
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