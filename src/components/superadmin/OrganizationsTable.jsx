import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { Loader2, Pencil, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function OrganizationsTable() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["sa-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: userCounts = {} } = useQuery({
    queryKey: ["sa-user-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("organization_id");
      if (error) throw error;
      const counts = {};
      data.forEach((p) => { counts[p.organization_id] = (counts[p.organization_id] || 0) + 1; });
      return counts;
    },
  });

  const handleEditSave = async (org) => {
    const { error } = await supabase.from("organizations").update({ name: editName }).eq("id", org.id);
    if (error) { toast.error("Failed to update name"); return; }
    toast.success("Organization name updated");
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["sa-orgs"] });
  };

  const handleToggleStatus = async (org) => {
    const newStatus = org.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("organizations").update({ status: newStatus }).eq("id", org.id);
    if (error) { toast.error("Failed to update status"); return; }
    toast.success(`Organization ${newStatus}`);
    qc.invalidateQueries({ queryKey: ["sa-orgs"] });
  };

  const handleDelete = async (org) => {
    const { error } = await supabase.from("organizations").delete().eq("id", org.id);
    if (error) { toast.error("Failed to delete organization"); return; }
    toast.success("Organization deleted");
    setDeletingId(null);
    qc.invalidateQueries({ queryKey: ["sa-orgs"] });
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>;

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">🏢 All Organizations</h2>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Users</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orgs.map((org) => (
              <tr key={org.id} className="bg-gray-900 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white">
                  {editingId === org.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-gray-800 border border-white/20 rounded px-2 py-1 text-sm text-white w-48"
                        onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(org); if (e.key === "Escape") setEditingId(null); }}
                        autoFocus
                      />
                      <button onClick={() => handleEditSave(org)} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <span>{org.name}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${org.status === "active" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                    {org.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300">{userCounts[org.id] || 0}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{org.created_at ? format(new Date(org.created_at), "MMM d, yyyy") : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditingId(org.id); setEditName(org.name); }} className="text-xs px-2 py-1 rounded bg-white/10 text-gray-300 hover:bg-white/20 flex items-center gap-1">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => handleToggleStatus(org)} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${org.status === "active" ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" : "bg-green-500/20 text-green-400 hover:bg-green-500/30"}`}>
                      {org.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    {deletingId === org.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-red-400">Confirm?</span>
                        <button onClick={() => handleDelete(org)} className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/40">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-xs px-2 py-1 rounded bg-white/10 text-gray-400 hover:bg-white/20">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingId(org.id)} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-500">No organizations found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}