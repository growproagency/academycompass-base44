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
        .select('id, title, content, is_pinned, organization_id, created_at')
        .eq('organization_id', profile.organization_id)
        .order('is_pinned', { ascending: false })
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
          content: body.trim(),
          organization_id: profile.organization_id,
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
    const { error } = await supabase
      .from('announcements')
      .update({ is_pinned: !ann.is_pinned })
      .eq('id', ann.id);
    if (error) {
      toast.error(`Failed to ${ann.is_pinned ? 'unpin' : 'pin'}: ${error.message}`);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
    toast.success(ann.is_pinned ? "Unpinned" : "Pinned");
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
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6" style={{ background: "#ffffff", fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1E293B" }}>Announcements</h1>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Team updates and news</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 transition-colors"
            style={{ background: "#22C55E", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "#16A34A"}
            onMouseLeave={e => e.currentTarget.style.background = "#22C55E"}
          >
            <Plus className="w-4 h-4" /> Post
          </button>
        )}
      </div>

      <div className="space-y-3">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className="group transition-all"
            style={{
              background: "#ffffff",
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              padding: 20,
              borderLeft: ann.is_pinned ? "4px solid #22C55E" : "1px solid #E2E8F0",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {ann.is_pinned && (
                    <span style={{ fontSize: 11, fontWeight: 600, background: "#FEF9C3", color: "#CA8A04", borderRadius: 6, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <Pin className="w-2.5 h-2.5" /> Pinned
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>
                    {ann.created_at ? format(new Date(ann.created_at), "MMM d, yyyy") : ""}
                  </span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B" }}>{ann.title}</h3>
                <p style={{ fontSize: 14, color: "#475569", marginTop: 6, whiteSpace: "pre-wrap" }}>{ann.content}</p>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: "#64748B" }} onClick={() => togglePin(ann)}>
                    {ann.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: "#64748B" }} onClick={() => openEdit(ann)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: "#EF4444" }} onClick={() => setDeleteAnn(ann)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="flex flex-col items-center text-center py-16" style={{ border: "1px solid #E2E8F0", borderRadius: 12, background: "#F8FAFC" }}>
            <Megaphone className="w-10 h-10 mb-3" style={{ color: "#CBD5E1" }} />
            <p style={{ fontSize: 14, color: "#64748B" }}>No announcements yet</p>
          </div>
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