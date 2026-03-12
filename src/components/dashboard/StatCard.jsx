import React from "react";
import { Card } from "@/components/ui/card";

export default function StatCard({ label, value, icon: Icon, color = "text-primary" }) {
  return (
    <Card className="p-4 bg-card border-border/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl bg-secondary ${color}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
        )}
      </div>
    </Card>
  );
}