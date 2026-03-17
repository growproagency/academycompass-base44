import React from "react";
import { Card } from "@/components/ui/card";

export default function StatCard({ label, value, icon: Icon, color = "text-primary" }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 32, fontWeight: 700, color: "#1E293B", lineHeight: 1 }}>{value}</p>
          <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{label}</p>
        </div>
        {Icon && (
          <Icon className={`w-6 h-6 ${color}`} />
        )}
      </div>
    </div>
  );
}