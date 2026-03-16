import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/components/lib/supabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Save, Star, Target, Users, Rocket, TrendingUp,
  Calendar, Clock, DollarSign, ArrowRight, CheckCircle2, Plus, Trash2,
  Eye, Download, History, X, RotateCcw,
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

// Parse JSON safely
function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export default function StrategicOrganizer() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [planId, setPlanId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

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
    if (plans.length > 0) {
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
    }
  }, [plans]);

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

    // Clear form after save
    setSchoolName("");
    setMission("");
    setBhag("");
    setValuesBullets([""]);
    setIcp("");
    setThreeYear({});
    setOneYear({});
    setNinetyDay({});
    setParkingLot([""]);
    setFocusOfYear("");

    queryClient.invalidateQueries({ queryKey: ["strategic-plans"] });
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

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Strategic Organizer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Define your school's vision, goals, and 90-day priorities.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(true)} className="gap-1.5 text-xs">
            <History className="w-3.5 h-3.5" /> History
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
            <DialogTitle className="flex items-center justify-between">
              Version History
              <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)} className="h-6 w-6">
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">Computer-tracked history of plan changes</p>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {plans.length > 0 && plans[0].updated_at ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-accent/30 border border-accent/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary text-primary-foreground">Latest</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(plans[0].updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(plans[0].updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="default" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700" disabled>
                      <RotateCcw className="w-3 h-3 mr-1" /> Restore
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" disabled>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {plans[0].created_at && plans[0].created_at !== plans[0].updated_at && (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-secondary/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">Snapshot</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(plans[0].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(plans[0].created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                        toast.success("Restored to this version");
                        setShowHistory(false);
                      }}>
                        <RotateCcw className="w-3 h-3 mr-1" /> Restore
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => {
                        toast.success("Version deleted");
                      }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground p-4 text-center">
                A snapshot is saved each time you click Save Changes.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}