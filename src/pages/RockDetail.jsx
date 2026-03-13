import React, { useState, useMemo } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { useAuth } from "@/components/lib/SupabaseAuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Mountain,
  ArrowLeft,
  Plus,
  Flag,
  CheckCircle2,
  Circle,
  Calendar,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { isPast, parseISO, format } from "date-fns";
import { toast } from "sonner";
import KanbanColumn from "@/components/dashboard/KanbanColumn";
import TaskDialog from "@/components/tasks/TaskDialog";

const STATUS_CONFIG = {
  on_track: { label: "On Track", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  off_track: { label: "Off Track", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  assist: { label: "Assist", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  complete: { label: "Complete", className: "bg-primary/10 text-primary border-primary/20" },
};

export default function RockDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const rockId = urlParams.get("id");
  const [createOpen, setCreateOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState("");
  const [addingMilestone, setAddingMilestone] = useState(false);
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  console.log('🔍 RockDetail auth state:', {
    hasUser: !!user,
    userId: user?.id,
    hasProfile: !!profile,
    organizationId: profile?.organization_id,
    rockId
  });

  const { data: rock, isLoading: rockLoading } = useQuery({
    queryKey: ["rock", rockId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rocks')
        .select('*')
        .eq('id', rockId)
        .single();
      return data;
    },
    enabled: !!rockId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["rock-tasks", rockId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('rock_id', rockId)
        .is('archived_at', null);
      return data || [];
    },
    enabled: !!rockId,
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["rock-milestones", rockId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('rock_id', rockId);
      return data || [];
    },
    enabled: !!rockId,
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

  const rockMap = useMemo(() => new Map(rocks.map((r) => [r.id, r.name])), [rocks]);

  const updateTask = useMutation({
    mutationFn: async ({ id, data: taskData }) => {
      console.log('📤 RockDetail: Updating task:', id, taskData);
      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', id)
        .select();
      if (error) {
        console.error('❌ RockDetail: Task update error:', error);
        toast.error(`Failed to update task: ${error.message}`);
        throw error;
      }
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rock-tasks", rockId] });
      toast.success("Task updated");
    },
  });

  const createTask = useMutation({
    mutationFn: async (taskData) => {
      console.log('🆕 RockDetail: Creating task');
      console.log('👤 User.id:', user?.id);
      console.log('🏢 Organization ID:', profile?.organization_id);
      
      if (!profile?.organization_id) {
        const errorMsg = 'Missing organization_id';
        console.error('❌', errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      const payload = {
        ...taskData,
        rock_id: rockId,
        organization_id: profile.organization_id,
      };
      
      console.log('📤 RockDetail: Task insert payload:', payload);
      
      const { data, error } = await supabase.from('tasks').insert([payload]).select();
      
      if (error) {
        console.error('❌ RockDetail: Task insert error:', error);
        console.error('📋 Failed payload:', payload);
        toast.error(`Failed to create task: ${error.message}`);
        throw error;
      }
      
      console.log('✅ RockDetail: Task created successfully');
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rock-tasks", rockId] });
      toast.success("Task created");
    },
  });

  const createMilestone = useMutation({
    mutationFn: async (milestoneData) => {
      console.log('🆕 RockDetail: Creating milestone');
      
      if (!profile?.organization_id) {
        const errorMsg = 'Missing organization_id';
        console.error('❌', errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      const payload = {
        ...milestoneData,
        organization_id: profile.organization_id,
      };
      
      console.log('📤 RockDetail: Milestone insert payload:', payload);
      
      const { data, error } = await supabase.from('milestones').insert([payload]).select();
      
      if (error) {
        console.error('❌ RockDetail: Milestone insert error:', error);
        toast.error(`Failed to create milestone: ${error.message}`);
        throw error;
      }
      
      console.log('✅ RockDetail: Milestone created successfully');
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rock-milestones", rockId] });
      toast.success("Milestone added");
    },
  });

  const toggleMilestone = useMutation({
    mutationFn: async ({ id, completed_at }) => {
      console.log('📤 RockDetail: Toggling milestone:', id);
      const { data, error } = await supabase
        .from('milestones')
        .update({ completed_at })
        .eq('id', id)
        .select();
      if (error) {
        console.error('❌ RockDetail: Milestone toggle error:', error);
        toast.error(`Failed to update milestone: ${error.message}`);
        throw error;
      }
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rock-milestones", rockId] });
    },
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id) => {
      console.log('🗑️ RockDetail: Deleting milestone:', id);
      const { error } = await supabase.from('milestones').delete().eq('id', id);
      if (error) {
        console.error('❌ RockDetail: Milestone delete error:', error);
        toast.error(`Failed to delete milestone: ${error.message}`);
        throw error;
      }
      console.log('✅ RockDetail: Milestone deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rock-milestones", rockId] });
      toast.success("Milestone deleted");
    },
  });

  const handleAddMilestone = async () => {
    console.log('🔘 RockDetail: Add milestone button clicked');
    if (!newMilestone.trim()) {
      toast.error("Milestone title is required");
      return;
    }
    
    setAddingMilestone(true);
    try {
      await createMilestone.mutateAsync({ rock_id: rockId, title: newMilestone.trim() });
      setNewMilestone("");
    } catch (error) {
      console.error('💥 RockDetail: Add milestone failed:', error);
    } finally {
      setAddingMilestone(false);
    }
  };

  const getColumnTasks = (status) => tasks.filter((t) => t.status === status);
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const taskProgress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const doneMilestones = milestones.filter((m) => m.completed_at).length;
  const milestoneProgress = milestones.length > 0 ? Math.round((doneMilestones / milestones.length) * 100) : 0;

  if (rockLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!rock) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Rock not found</p>
          <Link to="/Rocks"><Button variant="outline" size="sm" className="mt-3">Back to Rocks</Button></Link>
        </Card>
      </div>
    );
  }

  const sc = STATUS_CONFIG[rock.rock_status] || STATUS_CONFIG.on_track;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to="/Rocks">
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{rock.name}</h1>
            <Badge variant="outline" className={`text-[10px] ${sc.className}`}>{sc.label}</Badge>
          </div>
          {rock.description && <p className="text-sm text-muted-foreground mt-1">{rock.description}</p>}
          {rock.due_date && (
            <p className={`text-xs mt-1 ${isPast(parseISO(rock.due_date)) ? "text-red-400" : "text-muted-foreground"}`}>
              Due {format(parseISO(rock.due_date), "MMM d, yyyy")}
            </p>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>To-Dos: {doneTasks}/{tasks.length}</span>
            <span>{taskProgress}%</span>
          </div>
          <Progress value={taskProgress} className="h-2" />
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Milestones: {doneMilestones}/{milestones.length}</span>
            <span>{milestoneProgress}%</span>
          </div>
          <Progress value={milestoneProgress} className="h-2" />
        </Card>
      </div>

      {/* Milestones */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Flag className="w-4 h-4 text-violet-400" /> Milestones
          </h3>
        </div>
        <div className="space-y-2 mb-3">
          {milestones.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5 group">
              <button
                onClick={() => toggleMilestone.mutate({
                  id: m.id,
                  completed_at: m.completed_at ? null : new Date().toISOString(),
                })}
                className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  m.completed_at ? "border-violet-400 bg-violet-400/20" : "border-muted-foreground/30 hover:border-violet-400"
                }`}
              >
                {m.completed_at && <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
              </button>
              <span className={`text-sm flex-1 ${m.completed_at ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
              <button
                onClick={() => deleteMilestone.mutate(m.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newMilestone}
            onChange={(e) => setNewMilestone(e.target.value)}
            placeholder="Add milestone..."
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAddMilestone()}
          />
          <Button size="sm" className="h-8" onClick={handleAddMilestone} disabled={addingMilestone}>
            {addingMilestone ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </Card>

      {/* Kanban */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">To-Dos</h3>
        <Button size="sm" className="h-8 text-xs" onClick={() => setCreateOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New To-Do
        </Button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {["todo", "in_progress", "done"].map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={getColumnTasks(status)}
            rockMap={rockMap}
            onStatusChange={(task, newStatus) => updateTask.mutate({ id: task.id, data: { status: newStatus } })}
          />
        ))}
      </div>

      <TaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        rocks={rocks}
        users={users}
        user={user}
        profile={profile}
        defaultStatus="todo"
        onSave={async (data) => {
          console.log('💾 RockDetail: TaskDialog onSave called');
          try {
            await createTask.mutateAsync(data);
            setCreateOpen(false);
          } catch (error) {
            console.error('❌ RockDetail: Task creation failed:', error);
            // Dialog stays open on error
          }
        }}
      />
    </div>
  );
}