import React, { useState } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function OnboardClient() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: "", orgName: "", role: "admin" });
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.orgName) { toast.error("All fields required"); return; }
    setLoading(true);
    setInviteLink(null);

    // 1. Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert([{ name: form.orgName, status: "active" }])
      .select()
      .single();

    if (orgError) {
      toast.error(`Failed to create org: ${orgError.message}`);
      setLoading(false);
      return;
    }

    // 2. Insert invitation
    const token = crypto.randomUUID();
    const { error: inviteError } = await supabase
      .from("invitations")
      .insert([{
        email: form.email,
        organization_id: org.id,
        role: form.role,
        token,
        status: "pending",
      }]);

    if (inviteError) {
      toast.error(`Org created but invite failed: ${inviteError.message}`);
      setLoading(false);
      return;
    }

    const link = `${window.location.origin}/SignIn?invite=${token}`;
    setInviteLink(link);
    toast.success("Client onboarded successfully!");
    setForm({ email: "", orgName: "", role: "admin" });
    qc.invalidateQueries({ queryKey: ["sa-orgs"] });
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
      <h2 className="text-lg font-bold text-white mb-6">➕ Onboard New Client</h2>
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
          <label className="block text-sm text-gray-400 mb-1.5">Organization Name</label>
          <input
            type="text"
            value={form.orgName}
            onChange={(e) => setForm({ ...form, orgName: e.target.value })}
            placeholder="School Name / Dojo"
            className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          />
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
          Create Org & Send Invite
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