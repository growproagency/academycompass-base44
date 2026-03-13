import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
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
  X,
  LogOut,
  Search,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const LOGO_URL = "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=40&h=40&fit=crop&crop=center";

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
  const navigate = useNavigate();

  const { user: authUser, profile } = useAuth();

  const { data: tasks } = useQuery({
    queryKey: ["tasks-overdue-count", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('status', 'todo');
      return data || [];
    },
    initialData: [],
    enabled: !!profile?.organization_id,
  });

  const overdueCount = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done"
  ).length;

  const isAdmin = profile?.role === "admin";
  const initials = profile?.full_name?.charAt(0)?.toUpperCase() || authUser?.email?.charAt(0)?.toUpperCase() || "U";

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Add dark class to html
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const NavItem = ({ item }) => {
    const isActive =
      item.path === "/Dashboard"
        ? location.pathname === "/Dashboard" || location.pathname === "/"
        : location.pathname.startsWith(item.path);
    const showBadge = item.path === "/MyTasks" && overdueCount > 0;

    return (
      <Link
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
          isActive
            ? "bg-primary/10 text-primary border-l-2 border-primary ml-0"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        }`}
      >
        <item.icon className="w-4.5 h-4.5 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {showBadge && (
          <Badge variant="destructive" className="h-5 min-w-[20px] text-[10px] px-1.5">
            {overdueCount > 99 ? "99+" : overdueCount}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-sidebar flex flex-col border-r border-sidebar-border transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Mountain className="w-4.5 h-4.5 text-primary" />
          </div>
          <span className="font-semibold text-sidebar-foreground tracking-tight">
            Academy Compass
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {menuItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}

          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-3">
                <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold">
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
        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 bg-primary/20 text-primary">
              <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || authUser?.email || "User"}
              </p>
              <p className="text-[11px] text-sidebar-foreground/50 truncate">
                {authUser?.email || ""}
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  console.log('🚪 Layout: Signing out...');
                  await supabase.auth.signOut();
                  window.location.replace('/SignIn');
                } catch (error) {
                  console.error('❌ Layout sign out error:', error);
                  window.location.replace('/SignIn');
                }
              }}
              className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-card shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md hover:bg-secondary"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Mountain className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Academy Compass</span>
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