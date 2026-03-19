import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/components/lib/supabaseClient";
import { useAuth } from "@/components/lib/SupabaseAuthContext";
import { Loader2, Building2, Users, UserPlus, Mail, AlertTriangle, LogOut } from "lucide-react";
import OrganizationsTable from "@/components/superadmin/OrganizationsTable";
import UsersTable from "@/components/superadmin/UsersTable";
import OnboardClient from "@/components/superadmin/OnboardClient";
import InviteExistingOrg from "@/components/superadmin/InviteExistingOrg";
import DangerZone from "@/components/superadmin/DangerZone";

const TABS = [
  { id: "orgs", label: "All Organizations", icon: Building2 },
  { id: "users", label: "All Users", icon: Users },
  { id: "onboard", label: "Onboard New Client", icon: UserPlus },
  { id: "invite", label: "Invite to Existing Org", icon: Mail },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

export default function SuperAdmin() {
  const { user: authUser, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [isSuperAdmin, setIsSuperAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState("orgs");

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!authUser) { navigate("/SignIn"); return; }

    const checkSuperAdmin = async () => {
      const { data, error } = await supabase
        .from("super_admins")
        .select("email")
        .eq("email", authUser.email)
        .maybeSingle();
      if (error || !data) { navigate("/Dashboard"); return; }
      setIsSuperAdmin(true);
    };
    checkSuperAdmin();
  }, [authUser, isLoadingAuth, navigate]);

  if (isLoadingAuth || isSuperAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-gray-900 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Super Admin Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">{authUser?.email}</p>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate("/SignIn"); }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      <div className="flex">
        {/* Sidebar tabs */}
        <aside className="w-56 min-h-[calc(100vh-65px)] bg-gray-900 border-r border-white/10 p-3 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : tab.id === "danger"
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          {activeTab === "orgs" && <OrganizationsTable />}
          {activeTab === "users" && <UsersTable />}
          {activeTab === "onboard" && <OnboardClient />}
          {activeTab === "invite" && <InviteExistingOrg />}
          {activeTab === "danger" && <DangerZone />}
        </main>
      </div>
    </div>
  );
}