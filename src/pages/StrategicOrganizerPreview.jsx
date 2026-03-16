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
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = 15;

    // Helper: Add a section header with dark background
    const addSectionHeader = (text) => {
      if (yPos > pageHeight - 25) {
        doc.addPage();
        yPos = 15;
      }
      doc.setFillColor(20, 30, 50); // Dark navy
      doc.rect(margin, yPos, contentWidth, 8, "F");
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(text, margin + 3, yPos + 6);
      doc.setTextColor(0, 0, 0);
      yPos += 10;
    };

    // Helper: Add colored box section
    const addBoxSection = (title, content, bgColor = [41, 128, 185]) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 15;
      }
      // Header
      doc.setFillColor(...bgColor);
      doc.rect(margin, yPos, contentWidth, 6, "F");
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(title, margin + 2, yPos + 4.5);
      yPos += 6;
      
      // Content box
      doc.setDrawColor(41, 128, 185);
      doc.setLineWidth(0.5);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      
      const lines = doc.splitTextToSize(content, contentWidth - 4);
      const boxHeight = Math.max(lines.length * 4 + 2, 15);
      doc.rect(margin, yPos, contentWidth, boxHeight);
      doc.text(lines, margin + 2, yPos + 3);
      yPos += boxHeight + 2;
    };

    // Helper: Add bullet list in box
    const addBulletBoxSection = (title, bullets, bgColor = [41, 128, 185]) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 15;
      }
      doc.setFillColor(...bgColor);
      doc.rect(margin, yPos, contentWidth, 6, "F");
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(title, margin + 2, yPos + 4.5);
      yPos += 6;
      
      doc.setDrawColor(41, 128, 185);
      doc.setLineWidth(0.5);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      
      const bulletHeight = bullets.filter(b => b).length * 4 + 2;
      doc.rect(margin, yPos, contentWidth, bulletHeight);
      
      let bulletY = yPos + 3;
      bullets.filter(b => b).forEach(bullet => {
        doc.text(`• ${bullet}`, margin + 3, bulletY);
        bulletY += 4;
      });
      yPos += bulletHeight + 2;
    };

    // ===== PAGE 1: HEADER & FOUNDATION =====
    
    // Dark header
    doc.setFillColor(20, 30, 50);
    doc.rect(0, 0, pageWidth, 18, "F");
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(plan.school_name || "Strategic Plan", margin, 10);
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text("STRATEGIC ORGANIZER", margin, 15);
    yPos = 22;

    // FOUNDATION section
    addSectionHeader("FOUNDATION");

    // Mission & BHAG in 2 columns
    const colWidth = (contentWidth - 2) / 2;
    
    // Mission box
    doc.setFillColor(41, 128, 185);
    doc.rect(margin, yPos, colWidth, 6, "F");
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("MISSION", margin + 2, yPos + 4.5);
    
    // BHAG box
    doc.rect(margin + colWidth + 2, yPos, colWidth, 6, "F");
    doc.text("BHAG", margin + colWidth + 4, yPos + 4.5);
    yPos += 6;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.5);

    const missionLines = doc.splitTextToSize(plan.mission || "N/A", colWidth - 4);
    const missionHeight = Math.max(missionLines.length * 3.5 + 2, 20);
    doc.rect(margin, yPos, colWidth, missionHeight);
    doc.text(missionLines, margin + 2, yPos + 2);

    const bhagLines = doc.splitTextToSize(plan.bhag || "N/A", colWidth - 4);
    const bhagHeight = Math.max(bhagLines.length * 3.5 + 2, 20);
    doc.rect(margin + colWidth + 2, yPos, colWidth, bhagHeight);
    doc.text(bhagLines, margin + colWidth + 4, yPos + 2);

    yPos += Math.max(missionHeight, bhagHeight) + 2;

    // Values & ICP in 2 columns
    const valuesBullets = parseJSON(plan.values, []).filter(v => v);
    const valuesBulletText = valuesBullets.join("\n");
    
    doc.setFillColor(41, 128, 185);
    doc.rect(margin, yPos, colWidth, 6, "F");
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("VALUES", margin + 2, yPos + 4.5);
    
    doc.rect(margin + colWidth + 2, yPos, colWidth, 6, "F");
    doc.text("IDEAL CUSTOMER PROFILE", margin + colWidth + 4, yPos + 4.5);
    yPos += 6;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    
    const valuesLines = valuesBullets.map(v => `• ${v}`);
    const valuesHeight = Math.max(valuesLines.length * 3.5 + 2, 20);
    doc.setDrawColor(41, 128, 185);
    doc.rect(margin, yPos, colWidth, valuesHeight);
    doc.text(valuesLines, margin + 2, yPos + 2);

    const icpLines = doc.splitTextToSize(plan.ideal_customer_profile || "N/A", colWidth - 4);
    const icpHeight = Math.max(icpLines.length * 3.5 + 2, 20);
    doc.rect(margin + colWidth + 2, yPos, colWidth, icpHeight);
    doc.text(icpLines, margin + colWidth + 4, yPos + 2);

    yPos += Math.max(valuesHeight, icpHeight) + 3;

    // ===== PAGE 2: VISION & GOALS =====
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 15;
    }

    addSectionHeader("VISION & GOALS");

    // 3 Year Vision
    const threeYearMetrics = [
      { label: "DATE", value: threeYear?.target_date || "N/A" },
      { label: "REVENUE", value: threeYear?.revenue_target || "N/A" },
      { label: "STUDENTS", value: threeYear?.student_target || "N/A" },
      { label: "NET PROFIT", value: threeYear?.net_profit_target || "N/A" }
    ];

    doc.setFillColor(41, 128, 185);
    doc.rect(margin, yPos, contentWidth, 6, "F");
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("3 YEAR VISION", margin + 2, yPos + 4.5);
    yPos += 6;

    // Metrics row
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, contentWidth, 12);
    
    const metricColWidth = contentWidth / 4;
    threeYearMetrics.forEach((m, i) => {
      const x = margin + i * metricColWidth;
      doc.setFont(undefined, "bold");
      doc.setFontSize(7);
      doc.text(m.label, x + 1, yPos + 2);
      doc.setFont(undefined, "bold");
      doc.setFontSize(9);
      doc.text(m.value, x + 1, yPos + 7);
      if (i < 3) doc.line(x + metricColWidth, yPos, x + metricColWidth, yPos + 12);
    });
    yPos += 14;

    // Key achievements
    const threeYearBullets = threeYear?.bullets?.filter(b => b) || [];
    if (threeYearBullets.length > 0) {
      doc.setFont(undefined, "bold");
      doc.setFontSize(8);
      doc.text("KEY ACHIEVEMENTS / MILESTONES", margin + 1, yPos);
      yPos += 3;
      doc.setFont(undefined, "normal");
      doc.setFontSize(8);
      doc.setDrawColor(41, 128, 185);
      const bulletHeight = threeYearBullets.length * 3.5 + 2;
      doc.rect(margin, yPos, contentWidth, bulletHeight);
      let bulletY = yPos + 2;
      threeYearBullets.forEach(b => {
        doc.text(`• ${b}`, margin + 2, bulletY);
        bulletY += 3.5;
      });
      yPos += bulletHeight + 2;
    }

    // 1 Year Goal
    if (yPos > pageHeight - 35) {
      doc.addPage();
      yPos = 15;
    }

    const oneYearMetrics = [
      { label: "DATE", value: oneYear?.target_date || "N/A" },
      { label: "REVENUE", value: oneYear?.revenue_target || "N/A" },
      { label: "STUDENTS", value: oneYear?.student_target || "N/A" },
      { label: "NET PROFIT", value: oneYear?.net_profit_target || "N/A" }
    ];

    doc.setFillColor(41, 128, 185);
    doc.rect(margin, yPos, contentWidth, 6, "F");
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("1 YEAR GOAL", margin + 2, yPos + 4.5);
    yPos += 6;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    doc.setDrawColor(41, 128, 185);
    doc.rect(margin, yPos, contentWidth, 12);
    
    oneYearMetrics.forEach((m, i) => {
      const x = margin + i * metricColWidth;
      doc.setFont(undefined, "bold");
      doc.setFontSize(7);
      doc.text(m.label, x + 1, yPos + 2);
      doc.setFont(undefined, "bold");
      doc.setFontSize(9);
      doc.text(m.value, x + 1, yPos + 7);
      if (i < 3) doc.line(x + metricColWidth, yPos, x + metricColWidth, yPos + 12);
    });
    yPos += 14;

    const oneYearBullets = oneYear?.bullets?.filter(b => b) || [];
    if (oneYearBullets.length > 0) {
      doc.setFont(undefined, "bold");
      doc.setFontSize(8);
      doc.text("KEY ACHIEVEMENTS / MILESTONES", margin + 1, yPos);
      yPos += 3;
      doc.setFont(undefined, "normal");
      doc.setFontSize(8);
      doc.setDrawColor(41, 128, 185);
      const bulletHeight = oneYearBullets.length * 3.5 + 2;
      doc.rect(margin, yPos, contentWidth, bulletHeight);
      let bulletY = yPos + 2;
      oneYearBullets.forEach(b => {
        doc.text(`• ${b}`, margin + 2, bulletY);
        bulletY += 3.5;
      });
      yPos += bulletHeight + 2;
    }

    // 90 Day Projects
    if (yPos > pageHeight - 35) {
      doc.addPage();
      yPos = 15;
    }

    const ninetyDayMetrics = [
      { label: "DATE", value: ninetyDay?.target_date || "N/A" },
      { label: "REVENUE", value: ninetyDay?.revenue_target || "N/A" },
      { label: "STUDENTS", value: ninetyDay?.student_target || "N/A" },
      { label: "NET PROFIT", value: ninetyDay?.net_profit_target || "N/A" }
    ];

    doc.setFillColor(41, 128, 185);
    doc.rect(margin, yPos, contentWidth, 6, "F");
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("90 DAY PROJECTS", margin + 2, yPos + 4.5);
    yPos += 6;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    doc.setDrawColor(41, 128, 185);
    doc.rect(margin, yPos, contentWidth, 12);
    
    ninetyDayMetrics.forEach((m, i) => {
      const x = margin + i * metricColWidth;
      doc.setFont(undefined, "bold");
      doc.setFontSize(7);
      doc.text(m.label, x + 1, yPos + 2);
      doc.setFont(undefined, "bold");
      doc.setFontSize(9);
      doc.text(m.value, x + 1, yPos + 7);
      if (i < 3) doc.line(x + metricColWidth, yPos, x + metricColWidth, yPos + 12);
    });
    yPos += 14;

    const ninetyDayBullets = ninetyDay?.bullets?.filter(b => b) || [];
    if (ninetyDayBullets.length > 0) {
      doc.setFont(undefined, "bold");
      doc.setFontSize(8);
      doc.text("KEY ACHIEVEMENTS / MILESTONES", margin + 1, yPos);
      yPos += 3;
      doc.setFont(undefined, "normal");
      doc.setFontSize(8);
      doc.setDrawColor(41, 128, 185);
      const bulletHeight = ninetyDayBullets.length * 3.5 + 2;
      doc.rect(margin, yPos, contentWidth, bulletHeight);
      let bulletY = yPos + 2;
      ninetyDayBullets.forEach(b => {
        doc.text(`• ${b}`, margin + 2, bulletY);
        bulletY += 3.5;
      });
      yPos += bulletHeight + 2;
    }

    // ===== PAGE: CAPTURE =====
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 15;
    }

    addSectionHeader("CAPTURE");

    // Parking Lot & Focus in 2 columns
    doc.setFillColor(41, 128, 185);
    doc.rect(margin, yPos, colWidth, 6, "F");
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("THE PARKING LOT", margin + 2, yPos + 4.5);
    
    doc.rect(margin + colWidth + 2, yPos, colWidth, 6, "F");
    doc.text("FOCUS OF THE YEAR", margin + colWidth + 4, yPos + 4.5);
    yPos += 6;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    doc.setDrawColor(41, 128, 185);
    
    const parkingBullets = parseJSON(plan.parking_lot, []).filter(p => p);
    const parkingBulletText = parkingBullets.map(p => `• ${p}`);
    const parkingHeight = Math.max(parkingBullets.length * 3.5 + 2, 15);
    doc.rect(margin, yPos, colWidth, parkingHeight);
    doc.text(parkingBulletText, margin + 2, yPos + 2);

    const focusLines = doc.splitTextToSize(plan.focus_of_the_year || "N/A", colWidth - 4);
    const focusHeight = Math.max(focusLines.length * 3.5 + 2, 15);
    doc.rect(margin + colWidth + 2, yPos, colWidth, focusHeight);
    doc.text(focusLines, margin + colWidth + 4, yPos + 2);

    yPos += Math.max(parkingHeight, focusHeight) + 5;

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    doc.text(`Generated ${dateStr} · Academy Compass`, pageWidth - margin, pageHeight - 8, { align: "right" });

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