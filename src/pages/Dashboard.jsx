import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CheckSquare,
  Mountain,
  AlertCircle,
  TrendingUp,
  Loader2,
  Plus,
  Filter,
  ChevronRight,
  Megaphone,
  Pin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isPast, parseISO, format } from "date-fns";
import StatCard from "@/components/dashboard/StatCard";
import KanbanColumn from "@/components/dashboard/KanbanColumn";
import TaskDialog from "@/components/tasks/TaskDialog";

export default function Dashboard() {
  const [view, setView] = useState("todos");
  const [filterRock, setFilterRock] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState("todo");
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks-active"],
    queryFn: () => base44.entities.Task.filter({ archived_at: null }),
  });

  const { data: rocks = [] } = useQuery({
    queryKey: ["rocks"],
    queryFn: () => base44.entities.Rock.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements-pinned"],
    queryFn: () => base44.entities.Announcement.filter({ is_pinned: true }),
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const createTask = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks-active"] }),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks-active"] }),
  });

  const rockMap = useMemo(() => new Map(rocks.map((r) => [r.id, r.name])), [rocks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterRock !== "all" && t.rock_id !== filterRock) return false;
      return true;
    });
  }, [tasks, filterRock]);

  const getColumnTasks = (status) => filteredTasks.filter((t) => t.status === status);

  const stats = useMemo(() => ({
    totalTodos: tasks.length,
    overdue: tasks.filter((t) => t.due_date && isPast(parseISO(t.due_date)) && t.status !== "done").length,
    done: tasks.filter((t) => t.status === "done").length,
    rocksOnTrack: rocks.filter((r) => r.rock_status === "on_track" || r.rock_status === "complete").length,
    totalRocks: rocks.length,
  }), [tasks, rocks]);

  const handleStatusChange = (task, newStatus) => {
    updateTask.mutate({ id: task.id, data: { status: newStatus } });
  };

  const handleCreateTask = async (formData) => {
    await createTask.mutateAsync(formData);
  };

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Pinned announcement banner */}
      {announcements.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Pin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{announcements[0].title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{announcements[0].body}</p>
            </div>
            <Link to="/Announcements">
              <Button variant="ghost" size="sm" className="text-xs shrink-0">
                View all <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, {user?.full_name?.split(" ")[0] || "there"}
          </p>
        </div>
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="todos" className="text-xs">
              <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> To-Dos
            </TabsTrigger>
            <TabsTrigger value="rocks" className="text-xs">
              <Mountain className="w-3.5 h-3.5 mr-1.5" /> Rocks
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total To-Dos" value={stats.totalTodos} icon={CheckSquare} />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertCircle} color="text-red-400" />
        <StatCard label="Completed" value={stats.done} icon={TrendingUp} color="text-emerald-400" />
        <StatCard label="Rocks On Track" value={`${stats.rocksOnTrack}/${stats.totalRocks}`} icon={Mountain} color="text-amber-400" />
      </div>

      {view === "todos" ? (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterRock} onValueChange={setFilterRock}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="All Rocks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rocks</SelectItem>
                {rocks.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="ml-auto h-8 text-xs"
              onClick={() => { setCreateStatus("todo"); setCreateOpen(true); }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New To-Do
            </Button>
          </div>

          {/* Kanban Board */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {["todo", "in_progress", "done"].map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={getColumnTasks(status)}
                rockMap={rockMap}
                onStatusChange={handleStatusChange}
                onCreateClick={() => { setCreateStatus(status); setCreateOpen(true); }}
              />
            ))}
          </div>
        </>
      ) : (
        /* Rocks View */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rocks.map((rock) => {
            const rockTasks = tasks.filter((t) => t.rock_id === rock.id);
            const doneTasks = rockTasks.filter((t) => t.status === "done").length;
            const progress = rockTasks.length > 0 ? Math.round((doneTasks / rockTasks.length) * 100) : 0;
            const statusConfig = {
              on_track: { label: "On Track", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
              off_track: { label: "Off Track", className: "bg-red-500/10 text-red-400 border-red-500/20" },
              assist: { label: "Assist", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
              complete: { label: "Complete", className: "bg-primary/10 text-primary border-primary/20" },
            };
            const sc = statusConfig[rock.rock_status] || statusConfig.on_track;

            return (
              <Link key={rock.id} to={`/RockDetail?id=${rock.id}`}>
                <Card className="p-4 hover:border-border/80 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{rock.name}</h3>
                    <Badge variant="outline" className={`text-[10px] ${sc.className}`}>{sc.label}</Badge>
                  </div>
                  {rock.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{rock.description}</p>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>To-Dos: {doneTasks}/{rockTasks.length}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  {rock.due_date && (
                    <p className={`text-[10px] mt-2 ${isPast(parseISO(rock.due_date)) ? "text-red-400" : "text-muted-foreground"}`}>
                      Due {format(parseISO(rock.due_date), "MMM d, yyyy")}
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
          {rocks.length === 0 && (
            <Card className="p-8 col-span-full flex flex-col items-center text-center">
              <Mountain className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No Rocks yet</p>
              <Link to="/Rocks">
                <Button size="sm" className="mt-3 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Create Rock
                </Button>
              </Link>
            </Card>
          )}
        </div>
      )}

      <TaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        rocks={rocks}
        users={users}
        defaultStatus={createStatus}
        onSave={handleCreateTask}
      />
    </div>
  );
}