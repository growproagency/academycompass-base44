import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone,
  Plus,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { format } from "date-fns";
import { toast } from "sonner";

export default function Announcements() {
  const [formOpen, setFormOpen] = useState(false);
  const [editAnn, setEditAnn] = useState(null);
  const [deleteAnn, setDeleteAnn] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => base44.entities.Announcement.list("-created_date"),
  });

  const isAdmin = user?.role === "admin";

  const openCreate = () => {
    setEditAnn(null);
    setTitle("");
    setBody("");
    setFormOpen(true);
  };

  const openEdit = (ann) => {
    setEditAnn(ann);
    setTitle(ann.title);
    setBody(ann.body);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    if (editAnn) {
      await base44.entities.Announcement.update(editAnn.id, { title: title.trim(), body: body.trim() });
      toast.success("Announcement updated");
    } else {
      await base44.entities.Announcement.create({ title: title.trim(), body: body.trim() });
      toast.success("Announcement posted");
    }
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
    setSaving(false);
    setFormOpen(false);
  };

  const togglePin = async (ann) => {
    await base44.entities.Announcement.update(ann.id, { is_pinned: !ann.is_pinned });
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
    toast.success(ann.is_pinned ? "Unpinned" : "Pinned");
  };

  const handleDelete = async () => {
    if (!deleteAnn) return;
    await base44.entities.Announcement.delete(deleteAnn.id);
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
    toast.success("Announcement deleted");
    setDeleteAnn(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Team updates and news</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" /> Post
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {announcements.map((ann) => (
          <Card key={ann.id} className={`p-5 ${ann.is_pinned ? "border-primary/30 bg-primary/5" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {ann.is_pinned && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                      <Pin className="w-2.5 h-2.5 mr-0.5" /> Pinned
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(ann.created_date), "MMM d, yyyy")}
                  </span>
                </div>
                <h3 className="font-semibold">{ann.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{ann.body}</p>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePin(ann)}>
                    {ann.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ann)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteAnn(ann)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
        {announcements.length === 0 && (
          <Card className="p-12 text-center">
            <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No announcements yet</p>
          </Card>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editAnn ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
            </div>
            <div>
              <Label>Body *</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Write your announcement..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editAnn ? "Update" : "Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteAnn} onOpenChange={() => setDeleteAnn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}