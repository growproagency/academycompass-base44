import React, { useState, useEffect } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { useAuth } from "@/components/lib/SupabaseAuthContext";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import { toast } from "sonner";

function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export default function StrategicOrganizerPreview() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get("id");

  const { data: plan, isLoading } = useQuery({
    queryKey: ["strategic-plan", planId || profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;
      
      let query = supabase
        .from("strategic_plans")
        .select("*")
        .eq("organization_id", profile.organization_id);

      if (planId) {
        query = query.eq("id", planId);
      }

      const { data } = await query.maybeSingle();
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const generatePDF = () => {
    if (!plan) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const maxWidth = doc.internal.pageSize.width - 2 * margin;

    const addHeading = (text, level = 1) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      const sizes = { 1: 18, 2: 14, 3: 12 };
      doc.setFontSize(sizes[level]);
      doc.setFont(undefined, "bold");
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * 6 + 5;
    };

    const addText = (text, fontSize = 11, bold = false) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(fontSize);
      doc.setFont(undefined, bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * 5 + 2;
    };

    // Header
    addHeading(plan.school_name || "Strategic Plan", 1);
    addText("Strategic Organizer", 10, true);
    yPos += 5;

    // Foundation
    addHeading("FOUNDATION", 2);
    addText("Mission", 10, true);
    addText(plan.mission || "N/A");
    yPos += 3;
    addText("BHAG", 10, true);
    addText(plan.bhag || "N/A");
    yPos += 3;

    const values = parseJSON(plan.values, []);
    if (values.filter(v => v).length > 0) {
      addText("Core Values", 10, true);
      values.filter(v => v).forEach(v => addText(`• ${v}`, 11));
      yPos += 2;
    }

    addText("Ideal Customer Profile", 10, true);
    addText(plan.ideal_customer_profile || "N/A");

    doc.save(`${plan.school_name || "Strategic Plan"}.pdf`);
    toast.success("PDF downloaded");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No strategic plan found</p>
          <Button onClick={() => navigate("/StrategicOrganizer")}>Back to Organizer</Button>
        </div>
      </div>
    );
  }

  const schoolName = plan.school_name || "Strategic Plan";
  const mission = plan.mission || "";
  const bhag = plan.bhag || "";
  const valuesBullets = parseJSON(plan.values, [""]);
  const icp = plan.ideal_customer_profile || "";
  const threeYear = parseJSON(plan.three_year_visual, {});
  const oneYear = parseJSON(plan.one_year_goal, {});
  const ninetyDay = parseJSON(plan.ninety_day_project, {});
  const parkingLot = parseJSON(plan.parking_lot, [""]);
  const focusOfYear = plan.focus_of_the_year || "";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* Header Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b z-10 flex items-center justify-between px-6 py-3">
        <div>
          <h2 className="font-semibold text-gray-900">{schoolName} — Preview</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={generatePDF} className="gap-2 text-xs">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </Button>
          <Button size="icon" variant="ghost" onClick={() => navigate("/StrategicOrganizer")} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto mt-16 space-y-0">
        {/* Header Section */}
        <div className="bg-blue-900 text-white px-8 py-8 rounded-t-lg">
          <h1 className="text-4xl font-bold mb-2">{schoolName}</h1>
          <p className="text-blue-100 text-sm tracking-widest mb-1">STRATEGIC ORGANIZER</p>
          <p className="text-blue-200 text-xs">Academy Compass — Always know where your business is headed.</p>
        </div>

        {/* Foundation Section */}
        <div className="bg-white border border-t-0">
          <div className="bg-blue-900 text-white px-8 py-3 font-bold text-sm tracking-wider">FOUNDATION</div>
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-8">
              {/* Left Column: Mission & Core Values */}
              <div className="space-y-6">
                <div>
                  <p className="text-blue-700 font-semibold text-xs uppercase tracking-wide mb-2">Mission</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{mission || "N/A"}</p>
                </div>

                {valuesBullets.filter(v => v).length > 0 && (
                  <div>
                    <p className="text-blue-700 font-semibold text-xs uppercase tracking-wide mb-2">Core Values</p>
                    <ul className="text-gray-700 text-sm space-y-1">
                      {valuesBullets.filter(v => v).map((val, i) => (
                        <li key={i}>• {val}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column: BHAG & ICP */}
              <div className="space-y-6">
                <div>
                  <p className="text-amber-700 font-semibold text-xs uppercase tracking-wide mb-2">BHAG (Big Hairy Audacious Goal)</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{bhag || "N/A"}</p>
                </div>

                <div>
                  <p className="text-blue-700 font-semibold text-xs uppercase tracking-wide mb-2">Ideal Customer Profile</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{icp || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vision & Goals Section */}
        <div className="bg-white border border-t-0">
          <div className="bg-blue-900 text-white px-8 py-3 font-bold text-sm tracking-wider">VISION & GOALS</div>
          <div className="p-8 space-y-8">
            {/* 3 Year Vision */}
            <div className="border-b pb-8">
              <p className="text-blue-700 font-semibold text-xs uppercase tracking-wide mb-4">3 Year Vision</p>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-gray-600 text-[11px] mb-1 font-semibold">DUE</p>
                  <p className="text-gray-900 font-bold text-sm">{threeYear?.target_date || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-[11px] mb-1 font-semibold">REVENUE</p>
                  <p className="text-gray-900 font-bold text-sm">{threeYear?.revenue_target || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-[11px] mb-1 font-semibold">STUDENTS</p>
                  <p className="text-gray-900 font-bold text-sm">{threeYear?.student_target || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-[11px] mb-1 font-semibold">NET PROFIT</p>
                  <p className="text-gray-900 font-bold text-sm">{threeYear?.net_profit_target || "N/A"}</p>
                </div>
              </div>
              {threeYear?.bullets && threeYear.bullets.filter(b => b).length > 0 && (
                <ul className="text-gray-700 text-sm space-y-1">
                  {threeYear.bullets.filter(b => b).map((bullet, i) => (
                    <li key={i}>• {bullet}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* 1 Year Goal */}
            <div className="border-b pb-8">
              <p className="text-blue-700 font-semibold text-xs uppercase tracking-wide mb-4">1 Year Goal</p>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-gray-600 text-[11px] mb-1 font-semibold">DUE</p>
                  <p className="text-gray-900 font-bold text-sm">{oneYear?.target_date || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-[11px] mb-1 font-semibold">REVENUE</p>
                  <p className="text-gray-900 font-bold text-sm">{oneYear?.revenue_target || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-[11px] mb-1 font-semibold">STUDENTS</p>
                  <p className="text-gray-900 font-bold text-sm">{oneYear?.student_target || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-[11px] mb-1 font-semibold">NET PROFIT</p>
                  <p className="text-gray-900 font-bold text-sm">{oneYear?.net_profit_target || "N/A"}</p>
                </div>
              </div>
              {oneYear?.bullets && oneYear.bullets.filter(b => b).length > 0 && (
                <ul className="text-gray-700 text-sm space-y-1">
                  {oneYear.bullets.filter(b => b).map((bullet, i) => (
                    <li key={i}>• {bullet}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* 90 Day Projects */}
            <div>
              <p className="text-orange-700 font-semibold text-xs uppercase tracking-wide mb-4">90 Day Projects</p>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-gray-600 text-[11px] mb-1 font-semibold">DUE</p>
                  <p className="text-gray-900 font-bold text-sm">{ninetyDay?.target_date || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-[11px] mb-1 font-semibold">REVENUE</p>
                  <p className="text-gray-900 font-bold text-sm">{ninetyDay?.revenue_target || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-[11px] mb-1 font-semibold">STUDENTS</p>
                  <p className="text-gray-900 font-bold text-sm">{ninetyDay?.student_target || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-[11px] mb-1 font-semibold">NET PROFIT</p>
                  <p className="text-gray-900 font-bold text-sm">{ninetyDay?.net_profit_target || "N/A"}</p>
                </div>
              </div>
              {ninetyDay?.bullets && ninetyDay.bullets.filter(b => b).length > 0 && (
                <ul className="text-gray-700 text-sm space-y-1">
                  {ninetyDay.bullets.filter(b => b).map((bullet, i) => (
                    <li key={i}>• {bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Capture Section */}
        <div className="bg-white border border-t-0">
          <div className="bg-green-800 text-white px-8 py-3 font-bold text-sm tracking-wider">CAPTURE</div>
          <div className="p-8">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-green-700 font-semibold text-xs uppercase tracking-wide mb-3">The Parking Lot</p>
                {parkingLot.filter(p => p).length > 0 ? (
                  <ul className="text-gray-700 text-sm space-y-1">
                    {parkingLot.filter(p => p).map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">N/A</p>
                )}
              </div>
              <div>
                <p className="text-green-700 font-semibold text-xs uppercase tracking-wide mb-3">Focus of the Year</p>
                <p className="text-gray-700 text-sm leading-relaxed">{focusOfYear || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border border-t-0 px-8 py-4 rounded-b-lg flex justify-between text-xs text-gray-500">
          <span>Academy Compass — Strategic Organizer</span>
          <span>Generated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>
    </div>
  );
}