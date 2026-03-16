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
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 12;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = 12;

    // Dark header
    doc.setFillColor(20, 30, 50);
    doc.rect(0, 0, pageWidth, 15, "F");
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(plan.school_name || "Strategic Plan", margin, 8.5);
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.text("STRATEGIC ORGANIZER", margin, 12.5);
    yPos = 18;

    // Helper: Section header
    const addSectionHeader = (text) => {
      doc.setFillColor(20, 30, 50);
      doc.rect(margin, yPos, contentWidth, 6, "F");
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(text, margin + 2, yPos + 4.2);
      doc.setTextColor(0, 0, 0);
      yPos += 7;
    };

    // Helper: 2-column box row
    const addTwoColBoxes = (title1, content1, title2, content2) => {
      const colWidth = (contentWidth - 1.5) / 2;
      
      // Headers
      doc.setFillColor(41, 128, 185);
      doc.setLineWidth(0.3);
      doc.setDrawColor(41, 128, 185);
      doc.rect(margin, yPos, colWidth, 5, "F");
      doc.rect(margin + colWidth + 1.5, yPos, colWidth, 5, "F");
      
      doc.setFontSize(8);
      doc.setFont(undefined, "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(title1, margin + 1, yPos + 3.5);
      doc.text(title2, margin + colWidth + 2.5, yPos + 3.5);
      yPos += 5;

      // Content boxes
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");
      doc.setFontSize(7.5);
      
      const lines1 = doc.splitTextToSize(content1, colWidth - 2);
      const lines2 = doc.splitTextToSize(content2, colWidth - 2);
      const height = Math.max(lines1.length * 3.2 + 2, lines2.length * 3.2 + 2, 12);
      
      doc.setDrawColor(41, 128, 185);
      doc.rect(margin, yPos, colWidth, height);
      doc.rect(margin + colWidth + 1.5, yPos, colWidth, height);
      
      doc.text(lines1, margin + 1, yPos + 2);
      doc.text(lines2, margin + colWidth + 2.5, yPos + 2);
      
      yPos += height + 1.5;
    };

    // FOUNDATION
    addSectionHeader("FOUNDATION");
    const valuesList = parseJSON(plan.values, []).filter(v => v).join("\n");
    addTwoColBoxes("MISSION", plan.mission || "N/A", "BHAG", plan.bhag || "N/A");
    addTwoColBoxes("VALUES", valuesList.replace(/\n/g, "\n"), "IDEAL CUSTOMER PROFILE", plan.ideal_customer_profile || "N/A");

    // VISION & GOALS
    addSectionHeader("VISION & GOALS");

    // Helper: Vision section with metrics
    const addVisionSection = (title, dataObj) => {
      const colWidth = contentWidth / 4;
      
      // Title header
      doc.setFillColor(41, 128, 185);
      doc.rect(margin, yPos, contentWidth, 5, "F");
      doc.setFontSize(8);
      doc.setFont(undefined, "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(title, margin + 2, yPos + 3.5);
      yPos += 5;

      // Metrics row (DATE, REVENUE, STUDENTS, NET PROFIT)
      doc.setDrawColor(41, 128, 185);
      doc.setLineWidth(0.3);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "bold");
      doc.setFontSize(7);

      const metrics = [
        { label: "DATE", value: dataObj?.target_date || "N/A" },
        { label: "REVENUE", value: dataObj?.revenue_target || "N/A" },
        { label: "STUDENTS", value: dataObj?.student_target || "N/A" },
        { label: "NET PROFIT", value: dataObj?.net_profit_target || "N/A" }
      ];

      doc.rect(margin, yPos, contentWidth, 10);
      metrics.forEach((m, i) => {
        const x = margin + i * colWidth;
        doc.text(m.label, x + 1, yPos + 2.5);
        doc.setFont(undefined, "bold");
        doc.setFontSize(8);
        doc.text(m.value, x + 1, yPos + 6.5);
        doc.setFont(undefined, "bold");
        doc.setFontSize(7);
        if (i < 3) doc.line(x + colWidth, yPos, x + colWidth, yPos + 10);
      });
      yPos += 11;

      // Key Achievements header
      doc.setFillColor(41, 128, 185);
      doc.rect(margin, yPos, contentWidth, 5, "F");
      doc.setFontSize(7);
      doc.setFont(undefined, "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("KEY ACHIEVEMENTS / MILESTONES", margin + 2, yPos + 3.5);
      yPos += 5;

      // Bullets
      const bullets = (dataObj?.bullets || []).filter(b => b);
      const bulletHeight = Math.max(bullets.length * 3.2 + 2, 8);
      doc.setDrawColor(41, 128, 185);
      doc.rect(margin, yPos, contentWidth, bulletHeight);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");
      doc.setFontSize(7.5);
      
      let bulletY = yPos + 2;
      bullets.forEach(b => {
        doc.text(`• ${b}`, margin + 2, bulletY);
        bulletY += 3.2;
      });
      yPos += bulletHeight + 1.5;
    };

    addVisionSection("3 YEAR VISION", threeYear);
    addVisionSection("1 YEAR GOAL", oneYear);
    addVisionSection("90 DAY PROJECTS", ninetyDay);

    // CAPTURE
    addSectionHeader("CAPTURE");
    const parkingList = parseJSON(plan.parking_lot, []).filter(p => p).join("\n");
    addTwoColBoxes("THE PARKING LOT", parkingList.replace(/\n/g, "\n"), "FOCUS OF THE YEAR", plan.focus_of_the_year || "N/A");

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(128, 128, 128);
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    doc.text(`Generated ${dateStr} · Academy Compass`, pageWidth - margin, pageHeight - 5, { align: "right" });

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