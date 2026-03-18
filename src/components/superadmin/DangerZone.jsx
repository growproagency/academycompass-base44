import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DangerZone() {
  const qc = useQueryClient();
  const [deleteOrgId, setDeleteOrgId] = useState("");
  const [deactivateOrgId, setDeactivateOrgId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingDeactivate, setLoadingDeactivate] = useState(false);

  const { data: orgs = [] } = useQuery({
    queryKey: ["sa-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleDeleteOrg = async () => {
    if (!deleteOrgId) { toast.error("Select an organization"); return; }
    setLoadingDelete(true);
    // Delete all profiles in org first
    await supabase.from("profiles").delete().eq("organization_id", deleteOrgId);
    // Then delete the org
    const { error } = await supabase.from("organizations").delete().eq("id", deleteOrgId);
    if (error) { toast.error(`Failed: ${error.message}`); setLoadingDelete(false); return; }
    toast.success("Organization and all its users deleted");
    setDeleteOrgId("");
    setConfirmDelete(false);
    setLoadingDelete(false);
    qc.invalidateQueries({ queryKey: ["sa-orgs"] });
    qc.invalidateQueries({ queryKey: ["sa-profiles"] });
  };

  const handleBulkDeactivate = async () => {
    if (!deactivateOrgId) { toast.error("Select an organization"); return; }
    setLoadingDeactivate(true);
    const { error } = await supabase
      .from("profiles")
      .update({ status: "rejected" })
      .eq("organization_id", deactivateOrgId);
    if (error) { toast.error(`Failed: ${error.message}`); setLoadingDeactivate(false); return; }
    toast.success("All users in org deactivated");
    setDeactivateOrgId("");
    setConfirmDeactivate(false);
    setLoadingDeactivate(false);
    qc.invalidateQueries({ queryKey: ["sa-profiles"] });
  };

  return (
    <div className="max-w-xl space-y-8">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <h2 className="text-lg font-bold text-red-400">Danger Zone</h2>
      </div>

      {/* Delete Org */}
      <div className="p-5 rounded-xl border border-red-500/30 bg-red-500/5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white mb-1">Delete Organization & All Users</h3>
          <p className="text-xs text-gray-400">This will permanently delete the organization and all profiles belonging to it. This cannot be undone.</p>
        </div>
        <select
          value={deleteOrgId}
          onChange={(e) => { setDeleteOrgId(e.target.value); setConfirmDelete(false); }}
          className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
        >
          <option value="">Select organization...</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>

        {!confirmDelete ? (
          <button
            disabled={!deleteOrgId}
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Delete Organization
          </button>
        ) : (
          <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/40">
            <p className="text-sm text-red-300 font-semibold mb-3">⚠️ Are you absolutely sure? This is irreversible.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteOrg}
                disabled={loadingDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {loadingDelete && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Yes, delete everything
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 bg-white/10 text-gray-300 hover:bg-white/20 text-sm font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Deactivate */}
      <div className="p-5 rounded-xl border border-yellow-500/30 bg-yellow-500/5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white mb-1">Bulk Deactivate All Users in Org</h3>
          <p className="text-xs text-gray-400">Sets all users in the selected organization to deactivated status. They will lose access immediately.</p>
        </div>
        <select
          value={deactivateOrgId}
          onChange={(e) => { setDeactivateOrgId(e.target.value); setConfirmDeactivate(false); }}
          className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500"
        >
          <option value="">Select organization...</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>

        {!confirmDeactivate ? (
          <button
            disabled={!deactivateOrgId}
            onClick={() => setConfirmDeactivate(true)}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Bulk Deactivate Users
          </button>
        ) : (
          <div className="p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/40">
            <p className="text-sm text-yellow-300 font-semibold mb-3">⚠️ This will deactivate all users in this org. Confirm?</p>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDeactivate}
                disabled={loadingDeactivate}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {loadingDeactivate && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Yes, deactivate all
              </button>
              <button
                onClick={() => setConfirmDeactivate(false)}
                className="px-4 py-2 bg-white/10 text-gray-300 hover:bg-white/20 text-sm font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}