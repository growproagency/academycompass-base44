import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function UsersTable() {
  const qc = useQueryClient();
  const [reassignId, setReassignId] = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["sa-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["sa-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const orgMap = Object.fromEntries(orgs.map((o) => [o.id, o.name]));

  const handleToggleStatus = async (profile) => {
    const newStatus = profile.status === "approved" ? "rejected" : "approved";
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", profile.id);
    if (error) { toast.error("Failed to update status"); return; }
    toast.success(`User ${newStatus}`);
    qc.invalidateQueries({ queryKey: ["sa-profiles"] });
  };

  const handleReassign = async (profile) => {
    if (!selectedOrgId) { toast.error("Select an organization"); return; }
    const { error } = await supabase.from("profiles").update({ organization_id: selectedOrgId }).eq("id", profile.id);
    if (error) { toast.error("Failed to reassign"); return; }
    toast.success("User reassigned");
    setReassignId(null);
    setSelectedOrgId("");
    qc.invalidateQueries({ queryKey: ["sa-profiles"] });
  };

  const handleDelete = async (profile) => {
    const { error } = await supabase.from("profiles").delete().eq("id", profile.id);
    if (error) { toast.error("Failed to delete user"); return; }
    toast.success("User deleted");
    setDeletingId(null);
    qc.invalidateQueries({ queryKey: ["sa-profiles"] });
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>;

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">👥 All Users <span className="text-sm font-normal text-gray-400">({profiles.length})</span></h2>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Organization</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {profiles.map((p) => (
              <tr key={p.id} className="bg-gray-900 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{p.full_name || "—"}</td>
                <td className="px-4 py-3 text-gray-300 text-xs">{p.email}</td>
                <td className="px-4 py-3 text-gray-300 text-xs">
                  {reassignId === p.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        className="bg-gray-800 border border-white/20 rounded px-2 py-1 text-xs text-white"
                      >
                        <option value="">Select org...</option>
                        {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                      <button onClick={() => handleReassign(p)} className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500">Save</button>
                      <button onClick={() => { setReassignId(null); setSelectedOrgId(""); }} className="text-xs px-2 py-1 rounded bg-white/10 text-gray-400 hover:bg-white/20">✕</button>
                    </div>
                  ) : (
                    <span>{orgMap[p.organization_id] || "—"}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.role === "admin" ? "bg-purple-500/20 text-purple-400" : "bg-gray-500/20 text-gray-400"}`}>
                    {p.role || "member"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.status === "approved" || p.status === "active" ? "bg-green-500/20 text-green-400" : p.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => handleToggleStatus(p)} className={`text-xs px-2 py-1 rounded ${p.status === "approved" || p.status === "active" ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" : "bg-green-500/20 text-green-400 hover:bg-green-500/30"}`}>
                      {p.status === "approved" || p.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => { setReassignId(p.id); setSelectedOrgId(p.organization_id || ""); }} className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
                      Reassign
                    </button>
                    {deletingId === p.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-red-400">Sure?</span>
                        <button onClick={() => handleDelete(p)} className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/40">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-xs px-2 py-1 rounded bg-white/10 text-gray-400">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingId(p.id)} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-500">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}