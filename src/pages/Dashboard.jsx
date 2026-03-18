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
      // Try fetching with archived_at; fall back without it if column doesn't exist
      let { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, organization_id, created_by, title, description, status, priority, due_date, created_at, assigned_to, archived_at, repeat')
        .eq('organization_id', profile.organization_id);
      
      if (tasksError) {
        console.warn('⚠️ Dashboard: Tasks query with archived_at failed, retrying without it:', tasksError.message);
        const fallback = await supabase
          .from('tasks')
          .select('id, organization_id, created_by, title, description, status, priority, due_date, created_at, assigned_to, repeat')
          .eq('organization_id', profile.organization_id);
        tasksData = fallback.data;
        if (fallback.error) {
          console.error('❌ Dashboard: Tasks fallback query also failed:', fallback.error);
          return [];
        }
      }
      
      console.log('✅ Dashboard: Raw tasks fetched:', tasksData?.length || 0);
      
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
      
      // Step 5: Combine everything (filter out archived tasks client-side for safety)
      const activeTasks = tasksData.filter(t => !t.archived_at);
      console.log('🗄️ Dashboard: Active (non-archived) tasks:', activeTasks.length, '| Total:', tasksData.length);
      const tasksWithRelations = activeTasks.map(task => ({
        ...task,
        assignee: task.assigned_to ? assigneesMap.get(task.assigned_to) || null : null,
        subtasks: subtasksByTaskId.get(task.id) || [],
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

  const isAdmin = profile?.role?.toLowerCase() === 'admin';
  const rockMap = useMemo(() => new Map(rocks.map((r) => [r.id, r.name])), [rocks]);

  const filteredTasks = useMemo(() => {
    console.log('🔍 Dashboard: Filtering tasks');
    console.log('👤 Dashboard: User role:', profile?.role, '| profile.id:', profile?.id, '| isAdmin:', isAdmin);
    console.log('📊 Dashboard: Total tasks before filter:', tasks.length);

    const roleBased = tasks.filter((t) => {
      // Admins see all tasks (including unassigned)
      if (isAdmin) return true;
      // Regular members only see tasks assigned to them
      if (!t.assigned_to) {
        console.log(`🚫 Dashboard: Hiding unassigned task ${t.id} from non-admin`);
        return false;
      }
      if (t.assigned_to !== profile?.id) {
        console.log(`🚫 Dashboard: Hiding task ${t.id} assigned to someone else (${t.assigned_to})`);
        return false;
      }
      return true;
    });

    const filtered = roleBased.filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      return true;
    });

    console.log('✅ Dashboard: Visible tasks after role filter:', roleBased.length, '| after status filter:', filtered.length);
    console.log('📊 Dashboard: Tasks per status:', {
      todo: filtered.filter(t => t.status === 'todo').length,
      in_progress: filtered.filter(t => t.status === 'in_progress').length,
      done: filtered.filter(t => t.status === 'done').length,
    });

    return filtered;
  }, [tasks, filterStatus, isAdmin, profile?.id]);

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

  // handleCreateTask and handleUpdateTask are now handled inside TaskDialog itself.
  // These are kept as no-ops for backward compat but TaskDialog calls onSave() after save.
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6" style={{ background: "#ffffff", fontFamily: "'Inter', sans-serif" }}>
      {/* Pinned announcement banner */}
      {announcements.length > 0 && (
        <div style={{ background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 18px", borderLeft: "4px solid #22C55E", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-start gap-3">
            <Pin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#2AACE2" }} />
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{announcements[0].title}</p>
              {announcements[0].created_at && (
                <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{format(new Date(announcements[0].created_at), "MMM d, yyyy")}</p>
              )}
            </div>
            <Link to="/Announcements" style={{ fontSize: 13, fontWeight: 600, color: "#2AACE2", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 2 }}>
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1E293B" }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
            Welcome back, {profile?.full_name?.split(" ")[0] || authUser?.user_metadata?.full_name?.split(" ")[0] || authUser?.email?.split("@")[0] || "there"} 👋
          </p>
        </div>
        <div className="flex" style={{ border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
          {[
            { value: "todos", icon: CheckSquare, label: "To-Dos" },
            { value: "rocks", icon: Mountain, label: "Rocks" },
          ].map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setView(value)}
              className="flex items-center gap-1.5"
              style={{
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 600,
                background: view === value ? "#2AACE2" : "#ffffff",
                color: view === value ? "#ffffff" : "#64748B",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total To-Dos", value: stats.totalTodos, icon: CheckSquare, color: "#2AACE2" },
          { label: "Overdue", value: stats.overdue, icon: AlertCircle, color: "#EF4444" },
          { label: "Completed", value: stats.done, icon: TrendingUp, color: "#16A34A" },
          { label: "Rocks On Track", value: `${stats.rocksOnTrack}/${stats.totalRocks}`, icon: Mountain, color: "#F59E0B" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: 32, fontWeight: 700, color: "#1E293B", lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{label}</p>
              </div>
              <Icon className="w-6 h-6" style={{ color }} />
            </div>
          </div>
        ))}
      </div>

      {view === "todos" ? (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4" style={{ color: "#64748B" }} />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px] h-8 text-xs" style={{ border: "1px solid #E2E8F0", borderRadius: 8 }}>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <button
              className="ml-auto flex items-center gap-1.5 transition-colors"
              style={{ background: "#2AACE2", color: "#fff", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#1A8FBF"}
              onMouseLeave={e => e.currentTarget.style.background = "#2AACE2"}
              onClick={() => { setEditingTask(null); setCreateStatus("todo"); setCreateOpen(true); }}
            >
              <Plus className="w-3.5 h-3.5" /> New To-Do
            </button>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rocks.map((rock) => {
            const rockTasks = tasks.filter((t) => t.rock_id === rock.id);
            const doneTasks = rockTasks.filter((t) => t.status === "done").length;
            const progress = rockTasks.length > 0 ? Math.round((doneTasks / rockTasks.length) * 100) : 0;
            const statusConfig = {
              on_track: { label: "On Track", bg: "#DCFCE7", color: "#16A34A" },
              off_track: { label: "Off Track", bg: "#FEE2E2", color: "#DC2626" },
              assist: { label: "Assist", bg: "#FEF3C7", color: "#D97706" },
              complete: { label: "Complete", bg: "#DCFCE7", color: "#16A34A" },
            };
            const sc = statusConfig[rock.rock_status] || statusConfig.on_track;

            return (
              <Link key={rock.id} to={`/RockDetail?id=${rock.id}`}>
                <div
                  className="group transition-all cursor-pointer"
                  style={{ background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }} className="group-hover:text-green-600 transition-colors">{rock.name}</h3>
                    <span style={{ fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color, borderRadius: 6, padding: "2px 8px" }}>{sc.label}</span>
                  </div>
                  {rock.description && <p className="text-xs line-clamp-2 mb-3" style={{ color: "#64748B" }}>{rock.description}</p>}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between" style={{ fontSize: 12, color: "#64748B" }}>
                      <span>To-Dos: {doneTasks}/{rockTasks.length}</span>
                      <span>{progress}%</span>
                    </div>
                    <div style={{ background: "#E2E8F0", borderRadius: 3, height: 6, overflow: "hidden" }}>
                      <div style={{ background: "#2AACE2", width: `${progress}%`, height: "100%", borderRadius: 3 }} />
                    </div>
                  </div>
                  {rock.due_date && (
                    <p style={{ fontSize: 11, marginTop: 8, color: isPast(parseISO(rock.due_date)) ? "#EF4444" : "#64748B" }}>
                      Due {format(parseISO(rock.due_date), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
          {rocks.length === 0 && (
            <div className="p-8 col-span-full flex flex-col items-center text-center" style={{ border: "1px solid #E2E8F0", borderRadius: 12, background: "#F8FAFC" }}>
              <Mountain className="w-8 h-8 mb-2" style={{ color: "#CBD5E1" }} />
              <p style={{ fontSize: 14, color: "#64748B" }}>No Rocks yet</p>
              <Link to="/Rocks">
                <button className="mt-3 flex items-center gap-1.5" style={{ background: "#2AACE2", color: "#fff", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
                  <Plus className="w-3.5 h-3.5" /> Create Rock
                </button>
              </Link>
            </div>
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
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ["tasks-active"] });
          setCreateOpen(false);
          setEditingTask(null);
        }}
        onArchive={() => {
          queryClient.invalidateQueries({ queryKey: ["tasks-active"] });
          setCreateOpen(false);
          setEditingTask(null);
        }}
      />
    </div>
  );
}