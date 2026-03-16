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
import { Plus, Trash2, Loader2, Archive } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/components/lib/supabaseClient";
import { toast } from "sonner";

export default function TaskDialog({
  open, onOpenChange, task, rocks, users, onSave, onArchive,
  defaultStatus, user, profile
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: defaultStatus || "todo",
    priority: "medium",
    rock_id: "",
    assigned_to: "",
    due_date: "",
    subtasks: [],
  });
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const isAdmin = profile?.role?.toLowerCase() === "admin";

  useEffect(() => {
    if (open) {
      if (task) {
        setForm({
          title: task.title || "",
          description: task.description || "",
          status: task.status || "todo",
          priority: task.priority || "medium",
          rock_id: task.rock_id || "",
          assigned_to: task.assigned_to || "",
          due_date: task.due_date || "",
          repeat_frequency: task.repeat_frequency || "none",
          subtasks: task.subtasks || [],
        });
      } else {
        setForm({
          title: "",
          description: "",
          status: defaultStatus || "todo",
          priority: "medium",
          rock_id: "",
          assigned_to: "",
          due_date: "",
          repeat_frequency: "none",
          subtasks: [],
        });
      }
    }
  }, [open, task, defaultStatus]);

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    console.log('🔘 handleSubmit fired. profile:', profile, 'user:', user);

    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!profile?.organization_id) {
      toast.error(`Missing organization info. profile=${JSON.stringify(profile)}`);
      return;
    }



    setSaving(true);
    try {
      const { subtasks, ...taskFields } = form;

      const taskPayload = {
        title: taskFields.title.trim(),
        description: taskFields.description || null,
        status: taskFields.status,
        priority: taskFields.priority,
        due_date: taskFields.due_date || null,
        assigned_to: taskFields.assigned_to || null,
        repeat_frequency: taskFields.repeat_frequency || "none",
        organization_id: profile.organization_id,
        created_by: user?.id || null,
      };

      if (task) {
        // ---- UPDATE ----
        const { error: taskError } = await supabase
          .from('tasks')
          .update(taskPayload)
          .eq('id', task.id);

        if (taskError) {
          toast.error(`Update failed: ${taskError.message} (code: ${taskError.code})`);
          setSaving(false);
          return;
        }

        await syncSubtasks(task.id, subtasks, profile);
        toast.success('To-Do updated');
        onOpenChange(false);
        if (onSave) onSave();
      } else {
        // ---- CREATE ----
        const createPayload = { ...taskPayload };

        const { data: newTask, error: createError } = await supabase
          .from('tasks')
          .insert([createPayload])
          .select()
          .single();

        if (createError) {
          toast.error(`Create failed: ${createError.message} (code: ${createError.code})`);
          setSaving(false);
          return;
        }

        const validSubtasks = subtasks.filter(s => s.title?.trim());
        if (validSubtasks.length > 0) {
          const subtaskPayload = validSubtasks.map(s => ({
            task_id: newTask.id,
            title: s.title.trim(),
            completed: s.completed || false,
          }));
          await supabase.from('subtasks').insert(subtaskPayload);
        }

        toast.success('To-Do created');
        onOpenChange(false);
        if (onSave) onSave(newTask);
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Sync subtasks: delete removed, update existing, insert new
  const syncSubtasks = async (taskId, subtasks, profileData) => {
    console.log('🔄 TaskDialog: Syncing subtasks for task:', taskId);

    const { data: existing, error: fetchError } = await supabase
      .from('subtasks')
      .select('id, title, completed')
      .eq('task_id', taskId);

    if (fetchError) {
      console.error('❌ TaskDialog: Fetch existing subtasks error:', fetchError);
      return;
    }

    const existingIds = new Set(existing?.map(s => s.id) || []);
    const currentIds = new Set(subtasks.filter(s => s.id).map(s => s.id));

    // Delete removed
    const toDelete = [...existingIds].filter(id => !currentIds.has(id));
    if (toDelete.length > 0) {
      console.log('🗑️ TaskDialog: Deleting subtasks:', toDelete);
      const { error } = await supabase.from('subtasks').delete().in('id', toDelete);
      if (error) console.error('❌ TaskDialog: Delete subtasks error:', error);
    }

    // Insert/update
    for (const st of subtasks) {
      if (!st.title?.trim()) continue;
      const basePayload = { task_id: taskId, title: st.title.trim(), completed: st.completed || false };

      if (st.id && existingIds.has(st.id)) {
        const { error } = await supabase.from('subtasks').update(basePayload).eq('id', st.id);
        if (error) console.error('❌ TaskDialog: Update subtask error:', error);
      } else {
        const { error } = await supabase.from('subtasks').insert([basePayload]);
        if (error) console.error('❌ TaskDialog: Insert subtask error:', error);
      }
    }
    console.log('✅ TaskDialog: Subtasks synced');
  };

  const addSubtask = () => {
    setForm({ ...form, subtasks: [...form.subtasks, { title: "", completed: false }] });
  };

  const updateSubtask = async (idx, field, value) => {
    const updated = [...form.subtasks];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, subtasks: updated });

    // Immediately persist checkbox toggles for existing subtasks
    if (task && field === 'completed' && updated[idx].id) {
      console.log('☑️ TaskDialog: Persisting subtask toggle:', updated[idx].id, value);
      const { error } = await supabase
        .from('subtasks')
        .update({ completed: value })
        .eq('id', updated[idx].id);
      if (error) console.error('❌ TaskDialog: Subtask toggle error:', error);
    }
  };

  const removeSubtask = async (idx) => {
    const st = form.subtasks[idx];
    if (st.id) {
      console.log('🗑️ TaskDialog: Removing subtask:', st.id);
      const { error } = await supabase.from('subtasks').delete().eq('id', st.id);
      if (error) {
        console.error('❌ TaskDialog: Failed to delete subtask:', error);
        toast.error('Failed to delete subtask');
        return;
      }
    }
    setForm({ ...form, subtasks: form.subtasks.filter((_, i) => i !== idx) });
  };

  const handleArchive = async () => {
    if (!task || !isAdmin) return;
    setArchiving(true);
    const archivePayload = { archived_at: new Date().toISOString() };
    console.log('📦 TaskDialog: Archiving task:', task.id);
    console.log('📦 TaskDialog: Archive payload:', archivePayload);

    // Try with archived_by first; if column doesn't exist, retry without it
    const tryArchive = async (payload) => {
      const { error } = await supabase.from('tasks').update(payload).eq('id', task.id);
      return error;
    };

    let error = await tryArchive({ ...archivePayload, archived_by: user?.id || null });
    if (error && (error.message?.includes('archived_by') || error.code === '42703')) {
      console.warn('⚠️ TaskDialog: archived_by column not found, retrying without it');
      error = await tryArchive(archivePayload);
    }

    if (error) {
      console.error('❌ TaskDialog: Archive error:', error);
      toast.error(`Failed to archive: ${error.message}`);
    } else {
      console.log('✅ TaskDialog: Task archived successfully');
      toast.success('Task archived');
      onOpenChange(false);
      if (onArchive) onArchive();
    }
    setArchiving(false);
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
                <div key={st.id || idx} className="flex items-center gap-2">
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

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {task && isAdmin && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive mr-auto"
                onClick={handleArchive}
                disabled={archiving}
              >
                {archiving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Archive className="w-3.5 h-3.5 mr-1.5" />}
                Archive
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" disabled={saving} onClick={handleSubmit}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {task ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}