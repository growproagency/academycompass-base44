import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/components/lib/supabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Save, Star, Target, Users, Rocket, TrendingUp,
  Calendar, Clock, DollarSign, ArrowRight, CheckCircle2, Plus, Trash2,
  Eye, Download, History, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/components/lib/SupabaseAuthContext";
import jsPDF from "jspdf";

// Bullet list editor
function BulletList({ items, onChange, placeholder }) {
  const bullets = items?.length ? items : [""];

  const update = (idx, val) => {
    const next = [...bullets];
    next[idx] = val;
    onChange(next);
  };

  const add = () => onChange([...bullets, ""]);

  const remove = (idx) => {
    const next = bullets.filter((_, i) => i !== idx);
    onChange(next.length ? next : [""]);
  };

  return (
    <div className="space-y-1.5">
      {bullets.map((b, i) => (
        <div key={i} className="flex items-center gap-1.5 group">
          <span className="text-muted-foreground text-sm">•</span>
          <Input
            value={b}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            className="h-7 text-sm bg-muted/30 border-0 focus-visible:ring-1"
          />
          {bullets.length > 1 && (
            <button
              onClick={() => remove(i)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary mt-1 ml-4"
      >
        <Plus className="w-3 h-3" /> Add bullet
      </button>
    </div>
  );
}

// Section with target date + metrics + key achievements
function VisionGoalSection({ title, icon: Icon, iconColor, data, onChange }) {
  const update = (field, val) => onChange({ ...data, [field]: val });

  return (
    <div className="border border-border/50 rounded-xl p-5 space-y-4 bg-card">
      <h3 className={`font-semibold text-base flex items-center gap-2 ${iconColor}`}>
        <Icon className="w-4 h-4" /> {title}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Target Date
          </p>
          <Input
            type="date"
            value={data?.target_date || ""}
            onChange={(e) => update("target_date", e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Revenue Target
          </p>
          <Input
            value={data?.revenue_target || ""}
            onChange={(e) => update("revenue_target", e.target.value)}
            placeholder="e.g. $500,000"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
            <Users className="w-3 h-3" /> Student Target
          </p>
          <Input
            value={data?.student_target || ""}
            onChange={(e) => update("student_target", e.target.value)}
            placeholder="e.g. 250 students"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> Net Profit Target
          </p>
          <Input
            value={data?.net_profit_target || ""}
            onChange={(e) => update("net_profit_target", e.target.value)}
            placeholder="e.g. $120,000"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          Key Achievements / Milestones
        </p>
        <BulletList
          items={data?.bullets || [""]}
          onChange={(v) => update("bullets", v)}
          placeholder="What does success look like?"
        />
      </div>
    </div>
  );
}

// Member read-only view
function StrategicOrganizerMemberView({ schoolName, mission, bhag, valuesBullets, icp, threeYear, oneYear, ninetyDay, parkingLot, focusOfYear, generatePDF }) {
  const Section = ({ label, children }) => (
    <div className="border border-border/50 rounded-xl p-5 bg-card space-y-2">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{label}</h3>
      {children}
    </div>
  );

  const Field = ({ value, placeholder }) => (
    <p className="text-sm text-foreground whitespace-pre-wrap">{value || <span className="text-muted-foreground italic">{placeholder || "—"}</span>}</p>
  );

  const VisionSection = ({ title, data }) => (
    <div className="border border-border/50 rounded-xl p-5 bg-card space-y-3">
      <h3 className="font-semibold text-sm text-foreground">{title}</h3>
      {(data?.target_date || data?.revenue_target || data?.student_target || data?.net_profit_target) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data?.target_date && <div><p className="text-[10px] text-muted-foreground mb-0.5">Target Date</p><p className="text-xs font-medium">{data.target_date}</p></div>}
          {data?.revenue_target && <div><p className="text-[10px] text-muted-foreground mb-0.5">Revenue</p><p className="text-xs font-medium">{data.revenue_target}</p></div>}
          {data?.student_target && <div><p className="text-[10px] text-muted-foreground mb-0.5">Students</p><p className="text-xs font-medium">{data.student_target}</p></div>}
          {data?.net_profit_target && <div><p className="text-[10px] text-muted-foreground mb-0.5">Net Profit</p><p className="text-xs font-medium">{data.net_profit_target}</p></div>}
        </div>
      )}
      {data?.bullets?.filter(b => b).length > 0 && (
        <ul className="space-y-1">
          {data.bullets.filter(b => b).map((b, i) => (
            <li key={i} className="text-sm flex gap-2"><span className="text-muted-foreground">•</span>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Strategic Organizer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{schoolName || "Your school's strategic plan"}</p>
        </div>
        <button
          onClick={generatePDF}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Download PDF
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Foundation</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section label="Mission"><Field value={mission} placeholder="Not set" /></Section>
          <Section label="BHAG"><Field value={bhag} placeholder="Not set" /></Section>
          <Section label="Values">
            {valuesBullets?.filter(v => v).length > 0
              ? <ul className="space-y-1">{valuesBullets.filter(v => v).map((v, i) => <li key={i} className="text-sm flex gap-2"><span className="text-muted-foreground">•</span>{v}</li>)}</ul>
              : <p className="text-sm text-muted-foreground italic">Not set</p>}
          </Section>
          <Section label="Ideal Customer Profile"><Field value={icp} placeholder="Not set" /></Section>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Vision & Goals</p>
        <VisionSection title="3 Year Vision" data={threeYear} />
        <VisionSection title="1 Year Goal" data={oneYear} />
        <VisionSection title="90 Day Projects" data={ninetyDay} />
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Capture</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section label="The Parking Lot">
            {parkingLot?.filter(v => v).length > 0
              ? <ul className="space-y-1">{parkingLot.filter(v => v).map((v, i) => <li key={i} className="text-sm flex gap-2"><span className="text-muted-foreground">•</span>{v}</li>)}</ul>
              : <p className="text-sm text-muted-foreground italic">Not set</p>}
          </Section>
          <Section label="Focus of the Year"><Field value={focusOfYear} placeholder="Not set" /></Section>
        </div>
      </div>
    </div>
  );
}

// Parse JSON safely
function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export default function StrategicOrganizer() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role?.toLowerCase() === 'admin';
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [planId, setPlanId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [activeSnapIdx, setActiveSnapIdx] = useState(0); // 0 = latest/current

  const SNAPSHOTS_KEY = `strategic_snapshots_${profile?.organization_id}`;
  const [snapshots, setSnapshots] = useState(() => {
    try {
      const stored = localStorage.getItem(`strategic_snapshots_${profile?.organization_id}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const saveSnapshots = (newSnapshots) => {
    setSnapshots(newSnapshots);
    try { localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(newSnapshots)); } catch {}
  };

  const [schoolName, setSchoolName] = useState("");
  const [mission, setMission] = useState("");
  const [bhag, setBhag] = useState("");
  const [valuesBullets, setValuesBullets] = useState([""]);
  const [icp, setIcp] = useState("");
  const [threeYear, setThreeYear] = useState({});
  const [oneYear, setOneYear] = useState({});
  const [ninetyDay, setNinetyDay] = useState({});
  const [parkingLot, setParkingLot] = useState([""]);
  const [focusOfYear, setFocusOfYear] = useState("");

  const generatePDF = () => {
    const doc = new jsPDF();
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const maxWidth = doc.internal.pageSize.width - 2 * margin;

    const addText = (text, fontSize = 12, bold = false) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(fontSize);
      doc.setFont(undefined, bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * (fontSize / 3) + 5;
    };

    addText(schoolName || "Strategic Plan", 20, true);
    yPos += 5;
    addText("Mission", 14, true);
    addText(mission, 11);
    yPos += 3;
    addText("BHAG", 14, true);
    addText(bhag, 11);
    yPos += 3;
    addText("Values", 14, true);
    addText(valuesBullets.filter(v => v).join(", "), 11);
    yPos += 3;
    addText("3 Year Vision", 14, true);
    addText(`Target: ${threeYear?.target_date || "N/A"} | Revenue: ${threeYear?.revenue_target || "N/A"}`, 11);
    addText(threeYear?.bullets?.filter(b => b).join(", ") || "N/A", 11);

    doc.save(`${schoolName || "Strategic Plan"}.pdf`);
    toast.success("PDF downloaded");
  };

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["strategic-plans", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data } = await supabase
        .from("strategic_plans")
        .select("*")
        .eq("organization_id", profile.organization_id);
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  useEffect(() => {
    if (plans.length > 0 && !initialized) {
      const p = plans[0];
      setPlanId(p.id);
      setSchoolName(p.school_name || "");
      setMission(p.mission || "");
      setBhag(p.bhag || "");
      setValuesBullets(parseJSON(p.values, [""]));
      setIcp(p.ideal_customer_profile || "");
      setThreeYear(parseJSON(p.three_year_visual, {}));
      setOneYear(parseJSON(p.one_year_goal, {}));
      setNinetyDay(parseJSON(p.ninety_day_project, {}));
      setParkingLot(parseJSON(p.parking_lot, [""]));
      setFocusOfYear(p.focus_of_the_year || "");
      setInitialized(true);
    }
  }, [plans, initialized]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      school_name: schoolName,
      mission,
      bhag,
      values: JSON.stringify(valuesBullets),
      ideal_customer_profile: icp,
      three_year_visual: JSON.stringify(threeYear),
      one_year_goal: JSON.stringify(oneYear),
      ninety_day_project: JSON.stringify(ninetyDay),
      parking_lot: JSON.stringify(parkingLot),
      focus_of_the_year: focusOfYear,
      organization_id: profile?.organization_id,
    };

    if (planId) {
      const { error } = await supabase.from("strategic_plans").update(payload).eq("id", planId);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("strategic_plans").insert([payload]).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      if (data) setPlanId(data.id);
    }

    // Save snapshot of current state
    const newSnap = {
      savedAt: new Date().toISOString(),
      schoolName, mission, bhag,
      valuesBullets: [...valuesBullets],
      icp,
      threeYear: { ...threeYear },
      oneYear: { ...oneYear },
      ninetyDay: { ...ninetyDay },
      parkingLot: [...parkingLot],
      focusOfYear,
    };
    saveSnapshots([newSnap, ...snapshots]);
    setActiveSnapIdx(0);
    toast.success("Saved");
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Member read-only preview — same format as StrategicOrganizerPreview
  if (!isAdmin) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Strategic Organizer</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{schoolName || "Your school's strategic plan"}</p>
          </div>
          <button onClick={generatePDF} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent transition-colors">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
        </div>

        <div className="space-y-0">
          <div className="bg-blue-900 text-white px-8 py-8 rounded-t-lg">
            <h1 className="text-3xl font-bold mb-1">{schoolName || "Strategic Plan"}</h1>
            <p className="text-blue-200 text-xs">Academy Compass — Always know where your business is headed.</p>
          </div>

          <div className="bg-white border border-t-0">
            <div className="bg-blue-900 text-white px-8 py-3 font-bold text-sm tracking-wider">FOUNDATION</div>
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <p className="text-blue-700 font-semibold text-xs uppercase tracking-wide mb-2">Mission</p>
                    <p className="text-gray-700 text-sm leading-relaxed">{mission || "N/A"}</p>
                  </div>
                  {valuesBullets.filter(v => v).length > 0 && (
                    <div>
                      <p className="text-blue-700 font-semibold text-xs uppercase tracking-wide mb-2">Core Values</p>
                      <ul className="text-gray-700 text-sm space-y-1">{valuesBullets.filter(v => v).map((val, i) => <li key={i}>• {val}</li>)}</ul>
                    </div>
                  )}
                </div>
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

          <div className="bg-white border border-t-0">
            <div className="bg-blue-900 text-white px-8 py-3 font-bold text-sm tracking-wider">VISION & GOALS</div>
            <div className="p-8 space-y-8">
              {[
                { label: "3 Year Vision", data: threeYear, color: "text-blue-700" },
                { label: "1 Year Goal", data: oneYear, color: "text-blue-700" },
                { label: "90 Day Projects", data: ninetyDay, color: "text-orange-700" },
              ].map(({ label, data, color }, idx, arr) => (
                <div key={label} className={idx < arr.length - 1 ? "border-b pb-8" : ""}>
                  <p className={`${color} font-semibold text-xs uppercase tracking-wide mb-4`}>{label}</p>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    {[["DUE", data?.target_date], ["REVENUE", data?.revenue_target], ["STUDENTS", data?.student_target], ["NET PROFIT", data?.net_profit_target]].map(([k, v]) => (
                      <div key={k}><p className="text-gray-600 text-[11px] mb-1 font-semibold">{k}</p><p className="text-gray-900 font-bold text-sm">{v || "N/A"}</p></div>
                    ))}
                  </div>
                  {data?.bullets?.filter(b => b).length > 0 && (
                    <ul className="text-gray-700 text-sm space-y-1">{data.bullets.filter(b => b).map((b, i) => <li key={i}>• {b}</li>)}</ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-t-0">
            <div className="bg-green-800 text-white px-8 py-3 font-bold text-sm tracking-wider">CAPTURE</div>
            <div className="p-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-green-700 font-semibold text-xs uppercase tracking-wide mb-3">The Parking Lot</p>
                  {parkingLot.filter(p => p).length > 0
                    ? <ul className="text-gray-700 text-sm space-y-1">{parkingLot.filter(p => p).map((item, i) => <li key={i}>• {item}</li>)}</ul>
                    : <p className="text-gray-500 text-sm">N/A</p>}
                </div>
                <div>
                  <p className="text-green-700 font-semibold text-xs uppercase tracking-wide mb-3">Focus of the Year</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{focusOfYear || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-t-0 px-8 py-4 rounded-b-lg flex justify-between text-xs text-gray-500">
            <span>Academy Compass — Strategic Organizer</span>
            <span>Generated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Strategic Organizer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Define your school's vision, goals, and 90-day priorities.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(true)} className="gap-1.5 text-xs relative">
            <History className="w-3.5 h-3.5" /> History
            {snapshots.length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">{snapshots.length}</span>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/StrategicOrganizerPreview")} className="gap-1.5 text-xs">
            <Eye className="w-3.5 h-3.5" /> Preview
          </Button>
          <Button variant="outline" size="sm" onClick={generatePDF} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Saved
          </Button>
        </div>
      </div>

      {/* School Name */}
      <div className="border border-border/50 rounded-xl p-5 bg-card space-y-2">
        <p className="text-xs font-semibold underline">School Name</p>
        <Input
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="e.g. Dragon's Den Martial Arts"
          className="max-w-sm bg-muted/30"
        />
        <p className="text-[10px] text-muted-foreground">Appears as the header on your exported PDF</p>
      </div>

      {/* FOUNDATION */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Foundation</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mission */}
          <div className="border border-border/50 rounded-xl p-5 space-y-3 bg-card">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-blue-400">
              <Target className="w-4 h-4" /> Mission
            </h3>
            <Textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="Why does your school exist? What do you do and for whom?"
              rows={3}
              className="text-sm bg-muted/30 border-0 focus-visible:ring-1 resize-none"
            />
          </div>

          {/* BHAG */}
          <div className="border border-border/50 rounded-xl p-5 space-y-3 bg-card">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-amber-400">
              <Star className="w-4 h-4" /> BHAG
            </h3>
            <Textarea
              value={bhag}
              onChange={(e) => setBhag(e.target.value)}
              placeholder="Your Big Hairy Audacious Goal — the 10–25 year moonshot."
              rows={3}
              className="text-sm bg-muted/30 border-0 focus-visible:ring-1 resize-none"
            />
          </div>

          {/* Values */}
          <div className="border border-border/50 rounded-xl p-5 space-y-3 bg-card">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-blue-400">
              <Target className="w-4 h-4" /> Values
            </h3>
            <BulletList
              items={valuesBullets}
              onChange={setValuesBullets}
              placeholder="e.g. Discipline, Respect, Excellence..."
            />
          </div>

          {/* ICP */}
          <div className="border border-border/50 rounded-xl p-5 space-y-3 bg-card">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-blue-400">
              <Users className="w-4 h-4" /> Ideal Customer Profile
            </h3>
            <Textarea
              value={icp}
              onChange={(e) => setIcp(e.target.value)}
              placeholder="Who is your ideal student / family? Age, goals, location, mindset..."
              rows={3}
              className="text-sm bg-muted/30 border-0 focus-visible:ring-1 resize-none"
            />
          </div>
        </div>
      </div>

      {/* VISION & GOALS */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Vision &amp; Goals</p>
        <VisionGoalSection
          title="3 Year Vision"
          icon={TrendingUp}
          iconColor="text-blue-400"
          data={threeYear}
          onChange={setThreeYear}
        />
        <VisionGoalSection
          title="1 Year Goal"
          icon={TrendingUp}
          iconColor="text-amber-400"
          data={oneYear}
          onChange={setOneYear}
        />
        <VisionGoalSection
          title="90 Day Projects"
          icon={Rocket}
          iconColor="text-orange-400"
          data={ninetyDay}
          onChange={setNinetyDay}
        />
      </div>

      {/* CAPTURE */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Capture</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Parking Lot */}
          <div className="border border-border/50 rounded-xl p-5 space-y-3 bg-card">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-blue-400">
              <CheckCircle2 className="w-4 h-4" /> The Parking Lot
            </h3>
            <BulletList
              items={parkingLot}
              onChange={setParkingLot}
              placeholder="Ideas, initiatives, or projects to revisit later..."
            />
          </div>

          {/* Focus of the Year */}
          <div className="border border-border/50 rounded-xl p-5 space-y-3 bg-card">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-amber-400">
              <Star className="w-4 h-4" /> Focus of the Year
            </h3>
            <Textarea
              value={focusOfYear}
              onChange={(e) => setFocusOfYear(e.target.value)}
              placeholder="The single most important theme or initiative for this year."
              rows={3}
              className="text-sm bg-muted/30 border-0 focus-visible:ring-1 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Bottom Save */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>

      {/* History Modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              A snapshot is saved each time you click Save Changes.{snapshots.length > 0 ? ` ${snapshots.length} snapshot${snapshots.length !== 1 ? "s" : ""} saved.` : ""}
            </p>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {snapshots.length === 0 ? (
              <div className="text-sm text-muted-foreground p-6 text-center">
                No snapshots yet. Save your plan to create the first version.
              </div>
            ) : (
              snapshots.map((snap, idx) => {
                const isActive = idx === activeSnapIdx;
                const isLatest = idx === 0;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
                      isActive
                        ? "bg-primary/15 border-primary/50 ring-1 ring-primary/30"
                        : "bg-secondary/20 border-secondary/40 hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isLatest && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary text-primary-foreground shrink-0">Latest</span>
                        )}
                        {isActive && !isLatest && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-white shrink-0">Viewing</span>
                        )}
                        {isActive && isLatest && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white shrink-0">Current</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(snap.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {" at "}
                          {new Date(snap.savedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      {snap.schoolName && (
                        <p className="text-xs font-medium mt-0.5 truncate">{snap.schoolName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isActive && (
                        <Button
                          size="sm"
                          variant={isLatest ? "outline" : "default"}
                          className="text-xs h-7"
                          onClick={() => {
                            setSchoolName(snap.schoolName);
                            setMission(snap.mission);
                            setBhag(snap.bhag);
                            setValuesBullets(snap.valuesBullets);
                            setIcp(snap.icp);
                            setThreeYear(snap.threeYear);
                            setOneYear(snap.oneYear);
                            setNinetyDay(snap.ninetyDay);
                            setParkingLot(snap.parkingLot);
                            setFocusOfYear(snap.focusOfYear);
                            setActiveSnapIdx(idx);
                            toast.success(isLatest ? "Back to latest version." : "Restored — click Save to persist.");
                          }}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          {isLatest ? "Revert to Latest" : "Restore"}
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          saveSnapshots(snapshots.filter((_, i) => i !== idx));
                          if (activeSnapIdx >= idx) setActiveSnapIdx(Math.max(0, activeSnapIdx - 1));
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {activeSnapIdx !== 0 && snapshots.length > 0 && (
            <div className="pt-2 border-t text-xs text-amber-400 flex items-center gap-1.5">
              <RotateCcw className="w-3 h-3" />
              You are viewing an older version. Click "Save Changes" to save this as the latest, or "Revert to Latest" to go back.
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}