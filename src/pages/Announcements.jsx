import React, { useState } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { useAuth } from "@/components/lib/SupabaseAuthContext";
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
  const [body, setBody] = useState(""); // maps to 'content' column in DB
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  console.log('🔍 Announcements auth state:', {
    hasUser: !!user,
    hasProfile: !!profile,
    organizationId: profile?.organization_id,
    role: profile?.role
  });

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('❌ Announcements query error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const isAdmin = profile?.role?.toLowerCase() === "admin";

  const openCreate = () => {
    setEditAnn(null);
    setTitle("");
    setBody("");
    setFormOpen(true);
  };

  const openEdit = (ann) => {
    setEditAnn(ann);
    setTitle(ann.title);
    setBody(ann.content);
    setFormOpen(true);
  };

  const handleSave = async () => {
    console.log('🔘 Announcements: Save button clicked');
    console.log('👤 Announcements: user role:', profile?.role, '| isAdmin:', isAdmin, '| org:', profile?.organization_id);

    if (!isAdmin) {
      toast.error("Only admins can post announcements");
      return;
    }
    console.log('👤 Announcements: user role:', profile?.role, '| isAdmin:', isAdmin, '| org:', profile?.organization_id);

    if (!isAdmin) {
      toast.error("Only admins can post announcements");
      return;
    }

    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    
    if (!profile?.organization_id) {
      toast.error("Missing organization ID");
      console.error('❌ Cannot save announcement: no organization_id');
      return;
    }
    
    setSaving(true);
    
    try {
      if (editAnn) {
        console.log('📤 Announcements: Updating announcement:', editAnn.id);
        const { error } = await supabase
          .from('announcements')
          .update({ title: title.trim(), content: body.trim() })
          .eq('id', editAnn.id);
        if (error) {
          console.error('❌ Announcements: Update error:', error);
          toast.error(`Failed to update: ${error.message}`);
          setSaving(false);
          return;
        }
        console.log('✅ Announcements: Updated successfully');
        toast.success("Announcement updated");
      } else {
        const payload = {
          title: title.trim(),
          body: body.trim(),
          organization_id: profile.organization_id,
          is_pinned: false,
        };
        console.log('📤 Announcements: Creating announcement:', payload);
        console.log('👤 Auth user id:', user?.id, '| profile auth_user_id:', profile?.auth_user_id);
        const { data: insertData, error } = await supabase.from('announcements').insert([payload]).select();
        if (error) {
          console.error('❌ Announcements: Insert error:', error);
          console.error('📋 Error code:', error.code, '| message:', error.message, '| details:', error.details, '| hint:', error.hint);
          console.error('📋 Failed payload:', payload);
          toast.error(`Failed to create: ${error.message}`);
          setSaving(false);
          return;
        }
        console.log('✅ Announcements: Insert result:', insertData);
        console.log('✅ Announcements: Created successfully');
        toast.success("Announcement posted");
      }
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setSaving(false);
      setFormOpen(false);
    } catch (error) {
      console.error('💥 Announcements: Save exception:', error);
      toast.error(`Error: ${error.message}`);
      setSaving(false);
    }
  };

  const togglePin = async (ann) => {
    console.log('🔘 Announcements: Toggle pin clicked:', ann.id);
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_pinned: !ann.is_pinned })
        .eq('id', ann.id);
      if (error) {
        console.error('❌ Announcements: Toggle pin error:', error);
        toast.error(`Failed to ${ann.is_pinned ? 'unpin' : 'pin'}: ${error.message}`);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success(ann.is_pinned ? "Unpinned" : "Pinned");
    } catch (error) {
      console.error('💥 Announcements: Toggle pin exception:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    console.log('🔘 Announcements: Delete confirmed');
    if (!deleteAnn) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', deleteAnn.id);
      if (error) {
        console.error('❌ Announcements: Delete error:', error);
        toast.error(`Failed to delete: ${error.message}`);
        setDeleting(false);
        return;
      }
      console.log('✅ Announcements: Deleted successfully');
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement deleted");
      setDeleteAnn(null);
    } catch (error) {
      console.error('💥 Announcements: Delete exception:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setDeleting(false);
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
                    {ann.created_at ? format(new Date(ann.created_at), "MMM d, yyyy") : ""}
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
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}