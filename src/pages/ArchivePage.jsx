import React from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { useAuth } from "@/components/lib/SupabaseAuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, RotateCcw, Trash2, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
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

export default function ArchivePage() {
  const [deleteTask, setDeleteTask] = React.useState(null);
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const { data: archivedTasks = [], isLoading } = useQuery({
    queryKey: ["archived-tasks", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, priority, due_date, status, archived_at')
        .eq('organization_id', profile.organization_id)
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false });
      if (error) {
        console.error('❌ ArchivePage: Query error:', error);
        return [];
      }
      console.log('✅ ArchivePage: Archived tasks fetched:', data?.length || 0);
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
      queryClient.invalidateQueries({ queryKey: ["archived-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-active"] });
      toast.success("Task restored");
    },
  });

  const deleteTaskMut = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-tasks"] });
      toast.success("Task deleted permanently");
      setDeleteTask(null);
    },
  });

  const handleRestore = (task) => {
    updateTask.mutate({ id: task.id, data: { archived_at: null, status: "todo" } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Archive</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Archived To-Dos</p>
      </div>

      <div className="space-y-2">
        {archivedTasks.map((task) => (
          <Card key={task.id} className="p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground line-through">{task.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{task.priority}</Badge>
                {task.due_date && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" /> {format(parseISO(task.due_date), "MMM d")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleRestore(task)}>
                <RotateCcw className="w-3 h-3 mr-1" /> Restore
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTask(task)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        ))}
        {archivedTasks.length === 0 && (
          <Card className="p-12 text-center">
            <Archive className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No archived tasks</p>
          </Card>
        )}
      </div>

      <AlertDialog open={!!deleteTask} onOpenChange={() => setDeleteTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTaskMut.mutate(deleteTask.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}