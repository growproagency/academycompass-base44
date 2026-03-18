import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "@/components/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/lib/SupabaseAuthContext";
import {
  LayoutDashboard,
  Mountain,
  CheckSquare,
  Megaphone,
  CalendarDays,
  Archive,
  LayoutGrid,
  Shield,
  Menu,
  LogOut,
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/Dashboard" },
  { icon: Mountain, label: "Rocks", path: "/Rocks" },
  { icon: CheckSquare, label: "My To-Dos", path: "/MyTasks" },
  { icon: Megaphone, label: "Announcements", path: "/Announcements" },
  { icon: CalendarDays, label: "Calendar", path: "/Calendar" },
  { icon: Archive, label: "Archive", path: "/ArchivePage" },
  { icon: LayoutGrid, label: "Strategic Organizer", path: "/StrategicOrganizer" },
];

const adminItems = [
  { icon: Shield, label: "Admin Panel", path: "/AdminPanel" },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user: authUser, profile } = useAuth();

  const { data: myTaskCount = 0 } = useQuery({
    queryKey: ["tasks-my-count", profile?.id, profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id || !profile?.id) return 0;
      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('assigned_to', profile.id)
        .neq('status', 'done')
        .is('archived_at', null);
      return count || 0;
    },
    initialData: 0,
    enabled: !!profile?.organization_id && !!profile?.id,
  });

  const isAdmin = profile?.role === "admin";
  const initials = profile?.full_name?.charAt(0)?.toUpperCase() || authUser?.email?.charAt(0)?.toUpperCase() || "U";

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Remove dark class — light mode
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const NavItem = ({ item }) => {
    const isActive =
      item.path === "/Dashboard"
        ? location.pathname === "/Dashboard" || location.pathname === "/"
        : location.pathname.startsWith(item.path);
    const showBadge = item.path === "/MyTasks" && myTaskCount > 0;

    return (
      <Link
      to={item.path}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative ${
        isActive
          ? "text-white"
          : "text-[#CBD5E1] hover:text-white hover:bg-white/[0.06]"
      }`}
      style={isActive ? { background: "rgba(42,172,226,0.15)" } : {}}
      >
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
          style={{ background: "#2AACE2" }}
        />
      )}
      <item.icon className="w-4 h-4 shrink-0" style={isActive ? { color: "#2AACE2" } : {}} />
        <span className="flex-1">{item.label}</span>
        {showBadge && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white min-w-[18px] text-center">
            {myTaskCount > 99 ? "99+" : myTaskCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#ffffff" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          width: 240,
          background: "#1A1A2E",
          boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col px-5 pt-6 pb-4 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="45" width="14" height="55" rx="3" fill="#2AACE2"/>
              <rect x="23" y="25" width="14" height="75" rx="3" fill="#2AACE2"/>
              <rect x="41" y="55" width="14" height="45" rx="3" fill="#2AACE2"/>
              <rect x="59" y="35" width="14" height="65" rx="3" fill="#2AACE2"/>
              <rect x="77" y="65" width="14" height="35" rx="3" fill="#2AACE2"/>
              <polyline points="5,85 35,45 65,60 95,20" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <polygon points="95,20 80,22 88,34" fill="white"/>
            </svg>
            <span className="font-bold text-white text-[15px] tracking-tight leading-tight">
              Academy Compass
            </span>
          </div>
          <p className="text-[10px] font-medium pl-12" style={{ color: "#2AACE2" }}>
            Powered by Grow Pro
          </p>
        </div>

        {/* Divider */}
        <div className="mx-4 mb-3" style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {menuItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}

          {isAdmin && (
            <>
              <div className="pt-5 pb-2 px-3">
                <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#64748B" }}>
                  Administration
                </span>
              </div>
              {adminItems.map((item) => (
                <NavItem key={item.path} item={item} />
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3 px-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
              style={{ background: "#2AACE2" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {profile?.full_name || "User"}
              </p>
              <p className="text-[11px] truncate" style={{ color: "#64748B" }}>
                {authUser?.email || ""}
              </p>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.replace('/SignIn');
              }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "#64748B" }}
              onMouseEnter={e => e.currentTarget.style.color = "#ffffff"}
              onMouseLeave={e => e.currentTarget.style.color = "#64748B"}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ background: "#ffffff" }}>
        {/* Mobile header */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 h-14 shrink-0"
          style={{ borderBottom: "1px solid #E2E8F0", background: "#ffffff" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg"
            style={{ color: "#64748B" }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="45" width="14" height="55" rx="3" fill="#2AACE2"/>
              <rect x="23" y="25" width="14" height="75" rx="3" fill="#2AACE2"/>
              <rect x="41" y="55" width="14" height="45" rx="3" fill="#2AACE2"/>
              <rect x="59" y="35" width="14" height="65" rx="3" fill="#2AACE2"/>
              <rect x="77" y="65" width="14" height="35" rx="3" fill="#2AACE2"/>
              <polyline points="5,85 35,45 65,60 95,20" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <polygon points="95,20 80,22 88,34" fill="white"/>
            </svg>
            <span className="font-bold text-sm" style={{ color: "#1E293B" }}>Academy Compass</span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}