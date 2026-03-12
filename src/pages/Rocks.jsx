import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
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
  on_track: { label: "On Track", icon: TrendingUp, className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  off_track: { label: "Off Track", icon: TrendingDown, className: "bg-red-500/10 text-red-400 border-red-500/20" },
  assist: { label: "Assist", icon: HelpCircle, className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  complete: { label: "Complete", icon: CheckCircle2, className: "bg-primary/10 text-primary border-primary/20" },
};

function RockFormDialog({ open, onOpenChange, rock, onSuccess }) {
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
    if (!name.trim()) return;
    setSaving(true);
    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      due_date: dueDate || undefined,
      rock_status: status,
    };
    if (rock) {
      const { error } = await supabase.from('rocks').update(data).eq('id', rock.id);
      if (error) throw error;
      toast.success("Rock updated");
    } else {
      const { error } = await supabase.from('rocks').insert([data]);
      if (error) throw error;
      toast.success("Rock created");
    }
    queryClient.invalidateQueries({ queryKey: ["rocks"] });
    setSaving(false);
    onSuccess?.();
    onOpenChange(false);
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
  const [formOpen, setFormOpen] = useState(false);
  const [editRock, setEditRock] = useState(null);
  const [deleteRock, setDeleteRock] = useState(null);
  const queryClient = useQueryClient();

  const { data: rocks = [], isLoading } = useQuery({
    queryKey: ["rocks"],
    queryFn: async () => {
      const { data, error } = await supabase.from('rocks').select('*');
      return data || [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*');
      return data || [];
    },
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones"],
    queryFn: async () => {
      const { data, error } = await supabase.from('milestones').select('*');
      return data || [];
    },
  });

  const handleDelete = async () => {
    if (!deleteRock) return;
    const { error } = await supabase.from('rocks').delete().eq('id', deleteRock.id);
    if (error) throw error;
    toast.success("Rock deleted");
    queryClient.invalidateQueries({ queryKey: ["rocks"] });
    setDeleteRock(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rocks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your strategic 90-day goals</p>
        </div>
        <Button size="sm" onClick={() => { setEditRock(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> New Rock
        </Button>
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
            <Card key={rock.id} className="p-5 hover:border-border/80 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <Link to={`/RockDetail?id=${rock.id}`} className="flex-1 min-w-0">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{rock.name}</h3>
                </Link>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditRock(rock); setFormOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => setDeleteRock(rock)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <Badge variant="outline" className={`text-[10px] mb-3 ${sc.className}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {sc.label}
              </Badge>

              {rock.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{rock.description}</p>
              )}

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>To-Dos: {doneTasks}/{rockTasks.length}</span>
                    <span>{taskProgress}%</span>
                  </div>
                  <Progress value={taskProgress} className="h-1.5" />
                </div>

                {rockMilestones.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Milestones: {doneMilestones}/{rockMilestones.length}</span>
                    </div>
                    <Progress value={rockMilestones.length > 0 ? (doneMilestones / rockMilestones.length) * 100 : 0} className="h-1.5" />
                  </div>
                )}
              </div>

              {rock.due_date && (
                <div className={`flex items-center gap-1 mt-3 text-[11px] ${isPast(parseISO(rock.due_date)) ? "text-red-400" : "text-muted-foreground"}`}>
                  {isPast(parseISO(rock.due_date)) ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                  Due {format(parseISO(rock.due_date), "MMM d, yyyy")}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {rocks.length === 0 && (
        <Card className="p-12 flex flex-col items-center text-center">
          <Mountain className="w-10 h-10 text-muted-foreground mb-3" />
          <h3 className="font-semibold">No Rocks yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create your first strategic 90-day goal</p>
          <Button className="mt-4" onClick={() => { setEditRock(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Create Rock
          </Button>
        </Card>
      )}

      <RockFormDialog open={formOpen} onOpenChange={setFormOpen} rock={editRock} />

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