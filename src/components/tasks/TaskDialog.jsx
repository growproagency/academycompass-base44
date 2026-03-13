import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/components/lib/supabaseClient";

export default function TaskDialog({ open, onOpenChange, task, rocks, users, onSave, defaultStatus, user, profile }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    notes: "",
    status: defaultStatus || "todo",
    priority: "medium",
    rock_id: "",
    assigned_to: "",
    due_date: "",
    subtasks: [],
  });
  const [saving, setSaving] = useState(false);

  console.log('📋 TaskDialog rendered with:', {
    open,
    hasTask: !!task,
    hasUser: !!user,
    hasProfile: !!profile,
    userId: user?.id,
    organizationId: profile?.organization_id
  });

  useEffect(() => {
    if (open) {
      if (task) {
        setForm({
          title: task.title || "",
          description: task.description || "",
          notes: task.notes || "",
          status: task.status || "todo",
          priority: task.priority || "medium",
          rock_id: task.rock_id || "",
          assigned_to: task.assigned_to || "",
          due_date: task.due_date || "",
          subtasks: task.subtasks || [],
        });
      } else {
        setForm({
          title: "",
          description: "",
          notes: "",
          status: defaultStatus || "todo",
          priority: "medium",
          rock_id: "",
          assigned_to: "",
          due_date: "",
          subtasks: [],
        });
      }
    }
  }, [open, task, defaultStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔘 Create button clicked');
    
    if (!form.title.trim()) {
      console.warn('⚠️ Task title is required');
      return;
    }
    
    console.log('📤 Task form submission started');
    console.log('👤 Authenticated user.id:', user?.id);
    console.log('🏢 Profile organization_id:', profile?.organization_id);
    console.log('📋 Form data:', form);
    
    setSaving(true);
    
    try {
      await onSave(form);
      console.log('✅ Task saved successfully');
      setSaving(false);
    } catch (error) {
      console.error('❌ Task save failed:', error);
      setSaving(false);
      // Keep dialog open on error so user can retry
    }
  };

  const addSubtask = () => {
    setForm({ ...form, subtasks: [...form.subtasks, { title: "", completed: false }] });
  };

  const updateSubtask = async (idx, field, value) => {
    const updated = [...form.subtasks];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, subtasks: updated });
    
    // If editing existing task and toggling completed, save immediately
    if (task && field === 'completed' && updated[idx].id) {
      console.log('☑️ TaskDialog: Toggling subtask completion:', updated[idx].id, value);
      const { error } = await supabase
        .from('subtasks')
        .update({ completed: value })
        .eq('id', updated[idx].id);
      
      if (error) {
        console.error('❌ TaskDialog: Failed to update subtask:', error);
      } else {
        console.log('✅ TaskDialog: Subtask completion updated');
      }
    }
  };

  const removeSubtask = async (idx) => {
    const subtaskToRemove = form.subtasks[idx];
    
    // If it has an id, delete from database
    if (subtaskToRemove.id) {
      console.log('🗑️ TaskDialog: Deleting subtask:', subtaskToRemove.id);
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskToRemove.id);
      
      if (error) {
        console.error('❌ TaskDialog: Failed to delete subtask:', error);
        return;
      }
      console.log('✅ TaskDialog: Subtask deleted');
    }
    
    setForm({ ...form, subtasks: form.subtasks.filter((_, i) => i !== idx) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit To-Do" : "New To-Do"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What needs to be done?"
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Add details..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Rock</Label>
              <Select value={form.rock_id || "none"} onValueChange={(v) => setForm({ ...form, rock_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {rocks?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign To</Label>
              <Select value={form.assigned_to || "none"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Due Date</Label>
            <Input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Subtasks</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addSubtask} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {form.subtasks.map((st, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Checkbox
                    checked={st.completed}
                    onCheckedChange={(v) => updateSubtask(idx, "completed", v)}
                  />
                  <Input
                    value={st.title}
                    onChange={(e) => updateSubtask(idx, "title", e.target.value)}
                    placeholder="Subtask..."
                    className="h-8 text-sm"
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeSubtask(idx)}>
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {task ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}