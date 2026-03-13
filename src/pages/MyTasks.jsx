import React, { useState, useMemo } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { useAuth } from "@/components/lib/SupabaseAuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    queryKey: ["my-tasks", profile?.organization_id, user?.email],
    queryFn: async () => {
      if (!profile?.organization_id || !user?.email) {
        console.log('⚠️ MyTasks: Cannot fetch tasks - missing organization_id or user email');
        return [];
      }
      console.log('📡 MyTasks: Fetching tasks for:', { 
        organizationId: profile.organization_id, 
        userEmail: user.email 
      });
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:assigned_to (
            id,
            full_name
          )
        `)
        .eq('organization_id', profile.organization_id);
      if (error) {
        console.error('❌ MyTasks: Tasks query error:', error);
        return [];
      }
      console.log('✅ MyTasks: Tasks fetched:', data?.length || 0, 'tasks');
      console.log('📊 MyTasks: Task statuses:', data?.map(t => t.status));
      console.log('🔍 MyTasks: First task sample:', data?.[0]);
      return data || [];
    },
    enabled: !!profile?.organization_id && !!user?.email,
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
      toast.success("To-Do updated");
    },
  });

  const createTask = useMutation({
    mutationFn: async (taskData) => {
      console.log('🆕 MyTasks: Create task mutation triggered');
      console.log('📋 Raw form data received:', taskData);
      console.log('👤 Authenticated user.id:', user?.id);
      console.log('🏢 Profile organization_id:', profile?.organization_id);
      
      if (!profile?.organization_id) {
        const errorMsg = 'Missing organization_id';
        console.error('❌', errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      if (!user?.id) {
        const errorMsg = 'Missing authenticated user.id';
        console.error('❌', errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Build explicit payload matching ACTUAL public.tasks columns ONLY
      const payload = {
        title: taskData.title,
        description: taskData.description || null,
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        due_date: taskData.due_date || null,
        assigned_to: taskData.assigned_to || null,
        organization_id: profile.organization_id,
        created_by: user.id,
      };
      
      console.log('📤 MyTasks: Final payload (public.tasks columns ONLY):', payload);
      console.log('🗂️ Valid columns used:', Object.keys(payload));
      
      const { data, error } = await supabase.from('tasks').insert([payload]).select();
      
      if (error) {
        console.error('❌ MyTasks: Task insert error:', error);
        console.error('📋 Failed payload:', payload);
        console.error('🔍 Error code:', error.code);
        console.error('🔍 Error details:', error.details);
        console.error('🔍 Error hint:', error.hint);
        console.error('🔍 Error message:', error.message);
        toast.error(`Failed to create To-Do: ${error.message}`);
        throw error;
      }
      
      console.log('✅ MyTasks: Task created successfully:', data[0]);
      console.log('🔄 MyTasks: Invalidating query key: ["my-tasks", profile.organization_id, user.email]');
      return data[0];
    },
    onSuccess: (newTask) => {
      console.log('🎉 MyTasks: Create mutation onSuccess triggered');
      console.log('📝 MyTasks: New task data:', newTask);
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      console.log('✅ MyTasks: Query invalidated, list should refresh');
      toast.success("To-Do created");
    },
    onError: (error) => {
      console.error('💥 MyTasks: Create task mutation failed:', error);
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
        onSave={async (data) => {
          console.log('💾 TaskDialog onSave (edit) called with data:', data);
          try {
            await updateTask.mutateAsync({ id: editTask.id, data });
            setEditTask(null);
          } catch (error) {
            console.error('❌ Task update failed in onSave handler:', error);
          }
        }}
      />

      <TaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        rocks={rocks}
        users={users}
        user={user}
        profile={profile}
        onSave={async (data) => {
          console.log('💾 TaskDialog onSave called with data:', data);
          try {
            await createTask.mutateAsync(data);
            setCreateOpen(false);
          } catch (error) {
            console.error('❌ Task creation failed in onSave handler:', error);
            // Dialog stays open on error
          }
        }}
      />
    </div>
  );
}