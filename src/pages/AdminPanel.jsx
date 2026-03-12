import React from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { useAuth } from "@/components/lib/SupabaseAuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Users,
  Loader2,
  UserCheck,
  UserX,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser", authUser?.id],
    queryFn: async () => {
      if (!authUser) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      return data;
    },
    enabled: !!authUser,
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*');
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

  const { data: rocks = [] } = useQuery({
    queryKey: ["rocks"],
    queryFn: async () => {
      const { data, error } = await supabase.from('rocks').select('*');
      return data || [];
    },
  });

  const isAdmin = currentUser?.role === "admin";

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage users and system settings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-2xl font-bold">{users.length}</p>
          <p className="text-xs text-muted-foreground">Total Users</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold">{rocks.length}</p>
          <p className="text-xs text-muted-foreground">Total Rocks</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold">{tasks.length}</p>
          <p className="text-xs text-muted-foreground">Total To-Dos</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold">{tasks.filter((t) => t.status === "done").length}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </Card>
      </div>

      {/* Users table */}
      <Card>
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" /> Team Members
          </h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
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
                      className={u.role === "admin"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-secondary text-muted-foreground"}
                    >
                      {u.role || "user"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.created_date ? format(new Date(u.created_date), "MMM d, yyyy") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}