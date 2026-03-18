import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function InviteExistingOrg() {
  const [form, setForm] = useState({ email: "", orgId: "", role: "member" });
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data: orgs = [] } = useQuery({
    queryKey: ["sa-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("id, name").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.orgId) { toast.error("All fields required"); return; }
    setLoading(true);
    setInviteLink(null);

    const token = crypto.randomUUID();
    const { error } = await supabase.from("invitations").insert([{
      email: form.email,
      organization_id: form.orgId,
      role: form.role,
      token,
      status: "pending",
    }]);

    if (error) {
      toast.error(`Failed to create invite: ${error.message}`);
      setLoading(false);
      return;
    }

    const link = `${window.location.origin}/SignIn?invite=${token}`;
    setInviteLink(link);
    toast.success("Invite created!");
    setForm({ email: "", orgId: "", role: "member" });
    setLoading(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Invite link copied!");
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-bold text-white mb-6">📨 Invite to Existing Org</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Client Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="client@example.com"
            className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Organization</label>
          <select
            value={form.orgId}
            onChange={(e) => setForm({ ...form, orgId: e.target.value })}
            className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Select organization...</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Generate Invite Link
        </button>
      </form>

      {inviteLink && (
        <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <p className="text-sm text-green-400 font-semibold mb-2">✅ Invite Link Generated</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-green-300 bg-black/30 rounded px-3 py-2 break-all">{inviteLink}</code>
            <button onClick={copyLink} className="shrink-0 p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}