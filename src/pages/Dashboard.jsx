import React, { useState, useMemo } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { useAuth } from "@/components/lib/SupabaseAuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CheckSquare,
  Mountain,
  AlertCircle,
  TrendingUp,
  Loader2,
  Plus,
  Filter,
  ChevronRight,
  Megaphone,
  Pin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isPast, parseISO, format } from "date-fns";
import { toast } from "sonner";
import StatCard from "@/components/dashboard/StatCard";
import KanbanColumn from "@/components/dashboard/KanbanColumn";
import TaskDialog from "@/components/tasks/TaskDialog";

export default function Dashboard() {
  const [view, setView] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState("todo");
  const [editingTask, setEditingTask] = useState(null);
  const queryClient = useQueryClient();
  const { user: authUser, profile } = useAuth();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks-active", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) {
        console.log('⚠️ Dashboard: Cannot fetch tasks - no organization_id');
        return [];
      }
      
      console.log('📡 Dashboard: Fetching tasks for organization:', profile.organization_id);
      
      // Step 1: Fetch tasks (only real public.tasks columns)
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, organization_id, created_by, title, description, status, priority, due_date, created_at, assigned_to, repeat')
        .eq('organization_id', profile.organization_id);
      
      if (tasksError) {
        console.error('❌ Dashboard: Tasks query failed:', tasksError);
        console.error('🔍 Dashboard: Error details:', {
          message: tasksError.message,
          code: tasksError.code,
          details: tasksError.details,
          hint: tasksError.hint
        });
        return [];
      }
      
      console.log('✅ Dashboard: Raw tasks fetched:', tasksData?.length || 0);
      console.log('📊 Dashboard: Task statuses breakdown:', {
        todo: tasksData?.filter(t => t.status === 'todo').length || 0,
        in_progress: tasksData?.filter(t => t.status === 'in_progress').length || 0,
        done: tasksData?.filter(t => t.status === 'done').length || 0
      });
      
      if (!tasksData || tasksData.length === 0) {
        console.log('ℹ️ Dashboard: No tasks found for organization');
        return [];
      }
      
      // Step 2: Fetch all assignees for this org (batch query is more efficient)
      const assigneeIds = [...new Set(tasksData.map(t => t.assigned_to).filter(Boolean))];
      let assigneesMap = new Map();
      
      if (assigneeIds.length > 0) {
        const { data: assigneesData, error: assigneesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', assigneeIds);
        
        if (assigneesError) {
          console.error('❌ Dashboard: Assignees query error:', assigneesError);
        } else {
          console.log('✅ Dashboard: Assignees fetched:', assigneesData?.length || 0);
          assigneesData?.forEach(a => assigneesMap.set(a.id, a));
        }
      }
      
      // Step 3: Fetch all subtasks for these tasks (batch query)
      const taskIds = tasksData.map(t => t.id);
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('subtasks')
        .select('id, task_id, title, completed')
        .in('task_id', taskIds);
      
      if (subtasksError) {
        console.error('❌ Dashboard: Subtasks query error:', subtasksError);
      } else {
        console.log('✅ Dashboard: Subtasks fetched:', subtasksData?.length || 0);
      }
      
      // Step 4: Group subtasks by task_id
      const subtasksByTaskId = new Map();
      subtasksData?.forEach(st => {
        if (!subtasksByTaskId.has(st.task_id)) {
          subtasksByTaskId.set(st.task_id, []);
        }
        subtasksByTaskId.get(st.task_id).push(st);
      });
      
      // Step 5: Combine everything
      const tasksWithRelations = tasksData.map(task => ({
        ...task,
        assignee: task.assigned_to ? assigneesMap.get(task.assigned_to) : null,
        subtasks: subtasksByTaskId.get(task.id) || []
      }));
      
      console.log('✅ Dashboard: Final tasks with relations:', tasksWithRelations.length);
      console.log('📋 Dashboard: Sample task:', tasksWithRelations[0]);
      
      return tasksWithRelations;
    },
    enabled: !!profile?.organization_id,
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

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements-pinned", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('is_pinned', true);
      if (error) {
        console.error('❌ Announcements query error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const createTask = useMutation({
    mutationFn: async (taskData) => {
      console.log('🆕 Dashboard: Create task mutation triggered');
      console.log('📋 Raw form data received:', taskData);
      console.log('👤 Authenticated user.id:', authUser?.id);
      console.log('🏢 Profile organization_id:', profile?.organization_id);
      
      if (!profile?.organization_id) {
        const errorMsg = 'Missing organization_id';
        console.error('❌', errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      if (!authUser?.id) {
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
        created_by: authUser.id,
      };
      
      console.log('📤 Dashboard: Final payload (public.tasks columns ONLY):', payload);
      console.log('🗂️ Valid columns used:', Object.keys(payload));
      
      const { data, error } = await supabase.from('tasks').insert([payload]).select();
      
      if (error) {
        console.error('❌ Dashboard: Task insert error:', error);
        console.error('📋 Failed payload:', payload);
        console.error('🔍 Error code:', error.code);
        console.error('🔍 Error details:', error.details);
        console.error('🔍 Error hint:', error.hint);
        console.error('🔍 Error message:', error.message);
        toast.error(`Failed to create To-Do: ${error.message}`);
        throw error;
      }
      
      console.log('✅ Dashboard: Task created successfully:', data[0]);
      console.log('🔄 Dashboard: Invalidating query key: ["tasks-active", profile.organization_id]');
      return data[0];
    },
    onSuccess: (newTask) => {
      console.log('🎉 Dashboard: Create mutation onSuccess triggered');
      console.log('📝 Dashboard: New task data:', newTask);
      queryClient.invalidateQueries({ queryKey: ["tasks-active"] });
      console.log('✅ Dashboard: Query invalidated, list should refresh');
      toast.success('To-Do created');
    },
    onError: (error) => {
      console.error('💥 Dashboard: Create task mutation failed:', error);
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, data: taskData }) => {
      console.log('📤 Updating task:', id, taskData);
      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', id)
        .select();
      if (error) {
        console.error('❌ Task update error:', error);
        throw error;
      }
      console.log('✅ Task updated successfully');
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-active"] });
    },
    onError: (error) => {
      console.error('💥 Update task mutation failed:', error);
    },
  });

  const rockMap = useMemo(() => new Map(rocks.map((r) => [r.id, r.name])), [rocks]);

  const filteredTasks = useMemo(() => {
    console.log('🔍 Dashboard: Filtering tasks');
    console.log('📊 Dashboard: Total tasks before filter:', tasks.length);
    console.log('🎯 Dashboard: Current filter value:', filterStatus);
    console.log('📋 Dashboard: All task statuses:', tasks.map(t => ({ id: t.id, status: t.status })));
    
    const filtered = tasks.filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) {
        console.log(`⏩ Dashboard: Excluding task ${t.id} (status: ${t.status}, filter: ${filterStatus})`);
        return false;
      }
      return true;
    });
    
    console.log('✅ Dashboard: Filtered tasks count:', filtered.length);
    console.log('📊 Dashboard: Tasks per status:', {
      todo: filtered.filter(t => t.status === 'todo').length,
      in_progress: filtered.filter(t => t.status === 'in_progress').length,
      done: filtered.filter(t => t.status === 'done').length
    });
    
    return filtered;
  }, [tasks, filterStatus]);

  const getColumnTasks = (status) => {
    const statusTasks = filteredTasks.filter((t) => t.status === status);
    console.log(`🔍 Dashboard: getColumnTasks("${status}") checking ${filteredTasks.length} filtered tasks`);
    console.log(`📋 Dashboard: Tasks with status="${status}":`, statusTasks.map(t => ({ id: t.id, title: t.title })));
    console.log(`✅ Dashboard: getColumnTasks("${status}") returned ${statusTasks.length} tasks`);
    return statusTasks;
  };

  const stats = useMemo(() => ({
    totalTodos: tasks.length,
    overdue: tasks.filter((t) => t.due_date && isPast(parseISO(t.due_date)) && t.status !== "done").length,
    done: tasks.filter((t) => t.status === "done").length,
    rocksOnTrack: rocks.filter((r) => r.rock_status === "on_track" || r.rock_status === "complete").length,
    totalRocks: rocks.length,
  }), [tasks, rocks]);

  const handleStatusChange = (task, newStatus) => {
    updateTask.mutate({ id: task.id, data: { status: newStatus } });
  };

  const handleCreateTask = async (formData) => {
    console.log('💾 Dashboard: handleCreateTask called with data:', formData);
    try {
      // Extract subtasks for separate handling
      const { subtasks, ...taskData } = formData;
      
      console.log('📦 Dashboard: Task data:', taskData);
      console.log('📋 Dashboard: Subtasks:', subtasks);
      
      // Create main task
      const result = await createTask.mutateAsync(taskData);
      console.log('✅ Dashboard: Task created:', result);
      
      // Create subtasks if any
      if (subtasks && subtasks.length > 0) {
        console.log('➕ Dashboard: Creating subtasks...');
        // Only use real public.subtasks columns: id, task_id, title, completed, created_at
        const subtaskData = subtasks
          .filter(st => st.title && st.title.trim())
          .map((st) => ({
            task_id: result.id,
            title: st.title.trim(),
            completed: st.completed || false,
          }));
        
        if (subtaskData.length > 0) {
          console.log('📤 Dashboard: Subtask insert payload:', subtaskData);
          const { error: subtaskError } = await supabase
            .from('subtasks')
            .insert(subtaskData);
          
          if (subtaskError) {
            console.error('❌ Dashboard: Subtask creation error:', subtaskError);
            toast.error(`Task created but subtasks failed: ${subtaskError.message}`);
          } else {
            console.log('✅ Dashboard: Subtasks created');
          }
        }
        
        // Refresh to get subtasks
        queryClient.invalidateQueries({ queryKey: ["tasks-active"] });
      }
      
      setCreateOpen(false);
      setEditingTask(null);
      console.log('🚪 Dashboard: Modal closed');
    } catch (error) {
      console.error('❌ Dashboard: Failed to create task:', error);
      // Dialog stays open on error so user can retry
    }
  };

  const handleUpdateTask = async (formData) => {
    if (!editingTask) return;
    console.log('📝 Dashboard: handleUpdateTask called for task:', editingTask.id);
    console.log('📤 Dashboard: Update payload:', formData);
    
    try {
      // Extract subtasks for separate handling
      const { subtasks, ...taskData } = formData;
      
      console.log('📦 Dashboard: Main task data:', taskData);
      console.log('📋 Dashboard: Subtasks to sync:', subtasks);
      
      // Update main task
      const { data: updatedTask, error: taskError } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editingTask.id)
        .select()
        .single();
      
      if (taskError) {
        console.error('❌ Dashboard: Task update error:', taskError);
        toast.error(`Update failed: ${taskError.message}`);
        throw taskError;
      }
      
      console.log('✅ Dashboard: Task updated:', updatedTask);
      
      // Sync subtasks
      if (subtasks !== undefined) {
        console.log('🔄 Dashboard: Syncing subtasks...');
        
        // Get existing subtasks (only real columns)
        const { data: existingSubtasks, error: fetchError } = await supabase
          .from('subtasks')
          .select('id, task_id, title, completed')
          .eq('task_id', editingTask.id);
        
        if (fetchError) {
          console.error('❌ Dashboard: Fetch existing subtasks error:', fetchError);
        }
        
        const existingIds = new Set(existingSubtasks?.map(s => s.id) || []);
        const currentIds = new Set(subtasks.filter(s => s.id).map(s => s.id));
        
        // Delete removed subtasks
        const toDelete = [...existingIds].filter(id => !currentIds.has(id));
        if (toDelete.length > 0) {
          console.log('🗑️ Dashboard: Deleting subtasks:', toDelete);
          const { error: deleteError } = await supabase
            .from('subtasks')
            .delete()
            .in('id', toDelete);
          
          if (deleteError) {
            console.error('❌ Dashboard: Delete subtasks error:', deleteError);
          } else {
            console.log('✅ Dashboard: Deleted subtasks');
          }
        }
        
        // Insert or update subtasks (only real public.subtasks columns)
        for (const subtask of subtasks) {
          if (!subtask.title || !subtask.title.trim()) continue;
          
          const subtaskData = {
            task_id: editingTask.id,
            title: subtask.title.trim(),
            completed: subtask.completed || false,
          };
          
          if (subtask.id && existingIds.has(subtask.id)) {
            // Update existing
            console.log('📝 Dashboard: Updating subtask:', subtask.id);
            const { error: updateError } = await supabase
              .from('subtasks')
              .update(subtaskData)
              .eq('id', subtask.id);
            
            if (updateError) {
              console.error('❌ Dashboard: Update subtask error:', updateError);
            }
          } else {
            // Insert new (no id or id not in existing)
            console.log('➕ Dashboard: Inserting new subtask');
            const { error: insertError } = await supabase
              .from('subtasks')
              .insert([subtaskData]);
            
            if (insertError) {
              console.error('❌ Dashboard: Insert subtask error:', insertError);
            }
          }
        }
        
        console.log('✅ Dashboard: Subtasks synced');
      }
      
      // Refresh task list
      queryClient.invalidateQueries({ queryKey: ["tasks-active"] });
      
      setCreateOpen(false);
      setEditingTask(null);
      toast.success('To-Do updated');
      console.log('✅ Dashboard: Update complete');
    } catch (error) {
      console.error('❌ Dashboard: Failed to update task:', error);
      console.error('🔍 Dashboard: Error details:', error.message);
      toast.error(`Failed to update: ${error.message}`);
    }
  };

  const handleTaskClick = (task) => {
    console.log('🖱️ Dashboard: Task clicked:', task.id);
    setEditingTask(task);
    setCreateOpen(true);
  };

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Pinned announcement banner */}
      {announcements.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Pin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{announcements[0].title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{announcements[0].body}</p>
            </div>
            <Link to="/Announcements">
              <Button variant="ghost" size="sm" className="text-xs shrink-0">
                View all <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, {authUser?.user_metadata?.full_name?.split(" ")[0] || authUser?.email?.split("@")[0] || "there"}
          </p>
        </div>
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="todos" className="text-xs">
              <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> To-Dos
            </TabsTrigger>
            <TabsTrigger value="rocks" className="text-xs">
              <Mountain className="w-3.5 h-3.5 mr-1.5" /> Rocks
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total To-Dos" value={stats.totalTodos} icon={CheckSquare} />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertCircle} color="text-red-400" />
        <StatCard label="Completed" value={stats.done} icon={TrendingUp} color="text-emerald-400" />
        <StatCard label="Rocks On Track" value={`${stats.rocksOnTrack}/${stats.totalRocks}`} icon={Mountain} color="text-amber-400" />
      </div>

      {view === "todos" ? (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="ml-auto h-8 text-xs"
              onClick={() => { setEditingTask(null); setCreateStatus("todo"); setCreateOpen(true); }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New To-Do
            </Button>
          </div>

          {/* Kanban Board */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {["todo", "in_progress", "done"].map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={getColumnTasks(status)}
                rockMap={rockMap}
                onTaskClick={handleTaskClick}
                onStatusChange={handleStatusChange}
                onCreateClick={() => { setEditingTask(null); setCreateStatus(status); setCreateOpen(true); }}
              />
            ))}
          </div>
        </>
      ) : (
        /* Rocks View */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rocks.map((rock) => {
            const rockTasks = tasks.filter((t) => t.rock_id === rock.id);
            const doneTasks = rockTasks.filter((t) => t.status === "done").length;
            const progress = rockTasks.length > 0 ? Math.round((doneTasks / rockTasks.length) * 100) : 0;
            const statusConfig = {
              on_track: { label: "On Track", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
              off_track: { label: "Off Track", className: "bg-red-500/10 text-red-400 border-red-500/20" },
              assist: { label: "Assist", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
              complete: { label: "Complete", className: "bg-primary/10 text-primary border-primary/20" },
            };
            const sc = statusConfig[rock.rock_status] || statusConfig.on_track;

            return (
              <Link key={rock.id} to={`/RockDetail?id=${rock.id}`}>
                <Card className="p-4 hover:border-border/80 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{rock.name}</h3>
                    <Badge variant="outline" className={`text-[10px] ${sc.className}`}>{sc.label}</Badge>
                  </div>
                  {rock.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{rock.description}</p>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>To-Dos: {doneTasks}/{rockTasks.length}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  {rock.due_date && (
                    <p className={`text-[10px] mt-2 ${isPast(parseISO(rock.due_date)) ? "text-red-400" : "text-muted-foreground"}`}>
                      Due {format(parseISO(rock.due_date), "MMM d, yyyy")}
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
          {rocks.length === 0 && (
            <Card className="p-8 col-span-full flex flex-col items-center text-center">
              <Mountain className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No Rocks yet</p>
              <Link to="/Rocks">
                <Button size="sm" className="mt-3 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Create Rock
                </Button>
              </Link>
            </Card>
          )}
        </div>
      )}

      <TaskDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        rocks={rocks}
        users={users}
        user={authUser}
        profile={profile}
        defaultStatus={createStatus}
        onSave={editingTask ? handleUpdateTask : handleCreateTask}
      />
    </div>
  );
}