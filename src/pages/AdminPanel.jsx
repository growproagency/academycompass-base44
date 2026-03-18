import React, { useState } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { useAuth } from "@/components/lib/SupabaseAuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Users, Loader2, Plus, Copy, Check, UserMinus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const { profile, isLoadingAuth } = useAuth();
  const isAdmin = profile?.role?.toLowerCase() === "admin";

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const [removeTarget, setRemoveTarget] = useState(null); // user to confirm remove
  const [removing, setRemoving] = useState(false);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase.from("profiles").select("*").eq("organization_id", profile.organization_id);
      if (error) return [];
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["all-tasks", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase.from("tasks").select("*").eq("organization_id", profile.organization_id);
      if (error) return [];
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: rocks = [] } = useQuery({
    queryKey: ["rocks", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase.from("rocks").select("*").eq("organization_id", profile.organization_id);
      if (error) return [];
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) { toast.error("Email is required"); return; }
    setInviting(true);

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("invitations").insert([{
      email: inviteEmail.trim(),
      role: inviteRole,
      organization_id: profile.organization_id,
      status: "pending",
      expires_at: expiresAt,
      token,
    }]);

    if (error) {
      toast.error(`Failed to create invite: ${error.message}`);
      setInviting(false);
      return;
    }

    const link = `https://aios-academy-compass.base44.app/SignIn?invite=${token}`;
    setGeneratedLink(link);
    setInviting(false);
    toast.success("Invite created!");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    const { error } = await supabase.from("profiles").delete().eq("id", removeTarget.id);
    if (error) {
      toast.error(`Failed to remove: ${error.message}`);
    } else {
      toast.success(`${removeTarget.full_name || removeTarget.email} removed`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
    setRemoving(false);
    setRemoveTarget(null);
  };

  const resetInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteRole("member");
    setGeneratedLink("");
    setCopied(false);
  };

  if (isLoadingAuth) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 text-center max-w-sm">
          <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold">Profile Not Found</h3>
          <p className="text-sm text-muted-foreground mt-1">Unable to load your profile.</p>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 text-center max-w-sm">
          <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold">Admin Access Required</h3>
          <p className="text-sm text-muted-foreground mt-1">You don't have permission to view this page.</p>
        </Card>
      </div>
    );
  }

  if (usersLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage users and system settings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-2xl font-bold">{users.length}</p><p className="text-xs text-muted-foreground">Total Users</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold">{rocks.length}</p><p className="text-xs text-muted-foreground">Total Rocks</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold">{tasks.length}</p><p className="text-xs text-muted-foreground">Total To-Dos</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold">{tasks.filter((t) => t.status === "done").length}</p><p className="text-xs text-muted-foreground">Completed</p></Card>
      </div>

      {/* Users table */}
      <Card>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" /> Team Members
          </h2>
          {isAdmin && (
            <Button size="sm" className="gap-1.5" onClick={() => setShowInviteModal(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Member
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={u.role === "admin" ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary text-muted-foreground"}
                    >
                      {u.role || "user"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isAdmin && u.id !== profile.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5 text-xs"
                        onClick={() => setRemoveTarget(u)}
                      >
                        <UserMinus className="w-3.5 h-3.5" /> Remove
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Invite Modal */}
      <Dialog open={showInviteModal} onOpenChange={resetInviteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="member@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={!!generatedLink}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole} disabled={!!generatedLink}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {generatedLink && (
              <div className="space-y-1.5">
                <Label>Invite Link</Label>
                <div className="flex items-center gap-2">
                  <Input value={generatedLink} readOnly className="text-xs" />
                  <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Share this link with the member. It expires in 7 days.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetInviteModal}>Close</Button>
            {!generatedLink && (
              <Button onClick={handleSendInvite} disabled={inviting}>
                {inviting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Invite
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{removeTarget?.full_name || removeTarget?.email}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleRemoveMember}
              disabled={removing}
            >
              {removing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}