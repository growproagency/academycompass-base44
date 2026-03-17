import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { useAuth } from "@/components/lib/SupabaseAuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Mountain,
  Plus,
  Loader2,
  TrendingUp,
  TrendingDown,
  HelpCircle,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isPast, parseISO, format } from "date-fns";
import { toast } from "sonner";

const STATUS_CONFIG = {
  on_track: { label: "On Track", icon: TrendingUp, bg: "#DCFCE7", color: "#16A34A" },
  off_track: { label: "Off Track", icon: TrendingDown, bg: "#FEE2E2", color: "#DC2626" },
  assist: { label: "Assist", icon: HelpCircle, bg: "#FEF3C7", color: "#D97706" },
  complete: { label: "Complete", icon: CheckCircle2, bg: "#DCFCE7", color: "#16A34A" },
};

function RockFormDialog({ open, onOpenChange, rock, onSuccess, profile, user }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("on_track");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (open) {
      setName(rock?.name || "");
      setDescription(rock?.description || "");
      setDueDate(rock?.due_date || "");
      setStatus(rock?.rock_status || "on_track");
    }
  }, [open, rock]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Rock name is required");
      return;
    }
    
    if (!profile?.organization_id) {
      toast.error("Missing organization ID");
      console.error('❌ Cannot create rock: no organization_id');
      return;
    }
    
    setSaving(true);
    
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        rock_status: status,
        organization_id: profile.organization_id,
        owner_id: user?.email || profile?.email,
      };
      
      console.log('📤 Rock mutation payload:', data);
      
      if (rock) {
        const { error } = await supabase.from('rocks').update(data).eq('id', rock.id);
        if (error) {
          console.error('❌ Rock update error:', error);
          toast.error("Failed to update rock: " + error.message);
          setSaving(false);
          return;
        }
        console.log('✅ Rock updated successfully');
        toast.success("Rock updated");
      } else {
        const { error } = await supabase.from('rocks').insert([data]);
        if (error) {
          console.error('❌ Rock insert error:', error);
          toast.error("Failed to create rock: " + error.message);
          setSaving(false);
          return;
        }
        console.log('✅ Rock created successfully');
        toast.success("Rock created");
      }
      
      queryClient.invalidateQueries({ queryKey: ["rocks"] });
      setSaving(false);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('💥 Rock mutation exception:', error);
      toast.error("An error occurred: " + error.message);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{rock ? "Edit Rock" : "New Rock"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Rock Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Q1 Strategic Goal" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe this rock..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="off_track">Off Track</SelectItem>
                  <SelectItem value="assist">Assist</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {rock ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Rocks() {
  const { profile, user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editRock, setEditRock] = useState(null);
  const [deleteRock, setDeleteRock] = useState(null);
  const queryClient = useQueryClient();

  const { data: rocks = [], isLoading } = useQuery({
    queryKey: ["rocks", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('rocks')
        .select('*')
        .eq('organization_id', profile.organization_id);
      if (error) {
        console.error('❌ Rocks query error:', error);
        toast.error("Failed to load rocks");
        return [];
      }
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["all-tasks", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', profile.organization_id);
      if (error) {
        console.error('❌ Tasks query error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('organization_id', profile.organization_id);
      if (error) {
        console.error('❌ Milestones query error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const handleDelete = async () => {
    if (!deleteRock) return;
    
    try {
      console.log('🗑️ Deleting rock:', deleteRock.id);
      const { error } = await supabase.from('rocks').delete().eq('id', deleteRock.id);
      if (error) {
        console.error('❌ Rock delete error:', error);
        toast.error("Failed to delete rock: " + error.message);
        return;
      }
      console.log('✅ Rock deleted successfully');
      toast.success("Rock deleted");
      queryClient.invalidateQueries({ queryKey: ["rocks"] });
      setDeleteRock(null);
    } catch (error) {
      console.error('💥 Rock delete exception:', error);
      toast.error("An error occurred: " + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6" style={{ background: "#ffffff", fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1E293B" }}>Rocks</h1>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Your strategic 90-day goals</p>
        </div>
        <button
          onClick={() => { setEditRock(null); setFormOpen(true); }}
          className="flex items-center gap-2 transition-colors"
          style={{ background: "#22C55E", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = "#16A34A"}
          onMouseLeave={e => e.currentTarget.style.background = "#22C55E"}
        >
          <Plus className="w-4 h-4" /> New Rock
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rocks.map((rock) => {
          const rockTasks = tasks.filter((t) => t.rock_id === rock.id);
          const doneTasks = rockTasks.filter((t) => t.status === "done").length;
          const taskProgress = rockTasks.length > 0 ? Math.round((doneTasks / rockTasks.length) * 100) : 0;
          const rockMilestones = milestones.filter((m) => m.rock_id === rock.id);
          const doneMilestones = rockMilestones.filter((m) => m.completed_at).length;
          const sc = STATUS_CONFIG[rock.rock_status] || STATUS_CONFIG.on_track;
          const StatusIcon = sc.icon;

          return (
            <div
              key={rock.id}
              className="group transition-all"
              style={{
                background: "#ffffff",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: 20,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"}
            >
              <div className="flex items-start justify-between mb-3">
                <Link to={`/RockDetail?id=${rock.id}`} className="flex-1 min-w-0">
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }} className="hover:text-green-600 transition-colors">{rock.name}</h3>
                </Link>
                <div className="flex items-center gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditRock(rock); setFormOpen(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: "#64748B" }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteRock(rock)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: "#EF4444" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <span
                className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 mb-3"
                style={{ background: sc.bg, color: sc.color, fontSize: 11 }}
              >
                <StatusIcon className="w-3 h-3" />
                {sc.label}
              </span>

              {rock.description && (
                <p className="text-xs line-clamp-2 mb-3" style={{ color: "#64748B" }}>{rock.description}</p>
              )}

              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1" style={{ fontSize: 12, color: "#64748B" }}>
                    <span>To-Dos: {doneTasks}/{rockTasks.length}</span>
                    <span>{taskProgress}%</span>
                  </div>
                  <div style={{ background: "#E2E8F0", borderRadius: 3, height: 6, overflow: "hidden" }}>
                    <div style={{ background: "#22C55E", width: `${taskProgress}%`, height: "100%", borderRadius: 3, transition: "width 0.3s" }} />
                  </div>
                </div>

                {rockMilestones.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1" style={{ fontSize: 12, color: "#64748B" }}>
                      <span>Milestones: {doneMilestones}/{rockMilestones.length}</span>
                    </div>
                    <div style={{ background: "#E2E8F0", borderRadius: 3, height: 6, overflow: "hidden" }}>
                      <div style={{ background: "#22C55E", width: `${rockMilestones.length > 0 ? (doneMilestones / rockMilestones.length) * 100 : 0}%`, height: "100%", borderRadius: 3 }} />
                    </div>
                  </div>
                )}
              </div>

              {rock.due_date && (
                <div className="flex items-center gap-1 mt-3" style={{ fontSize: 11, color: isPast(parseISO(rock.due_date)) ? "#EF4444" : "#64748B" }}>
                  {isPast(parseISO(rock.due_date)) ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                  Due {format(parseISO(rock.due_date), "MMM d, yyyy")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {rocks.length === 0 && (
        <div className="flex flex-col items-center text-center py-16" style={{ border: "1px solid #E2E8F0", borderRadius: 12, background: "#F8FAFC" }}>
          <Mountain className="w-10 h-10 mb-3" style={{ color: "#CBD5E1" }} />
          <h3 style={{ fontWeight: 600, color: "#1E293B" }}>No Rocks yet</h3>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>Create your first strategic 90-day goal</p>
          <button
            className="mt-4 flex items-center gap-2"
            onClick={() => { setEditRock(null); setFormOpen(true); }}
            style={{ background: "#22C55E", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none" }}
          >
            <Plus className="w-4 h-4" /> Create Rock
          </button>
        </div>
      )}

      <RockFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        rock={editRock} 
        profile={profile}
        user={user}
      />

      <AlertDialog open={!!deleteRock} onOpenChange={() => setDeleteRock(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rock?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteRock?.name}". Tasks linked to this rock will be unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}