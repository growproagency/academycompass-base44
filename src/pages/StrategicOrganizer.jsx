import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Save,
  Star,
  Target,
  Users,
  Rocket,
  Mountain,
  Lightbulb,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const SECTIONS = [
  { key: "school_name", label: "School Name", icon: Mountain, type: "input", placeholder: "Your Academy Name" },
  { key: "mission", label: "Mission", icon: Star, type: "textarea", placeholder: "Why does your school exist?" },
  { key: "values", label: "Core Values", icon: Target, type: "textarea", placeholder: "What principles guide your school?" },
  { key: "ideal_customer_profile", label: "Ideal Customer Profile", icon: Users, type: "textarea", placeholder: "Who is your ideal student?" },
  { key: "bhag", label: "Big Hairy Audacious Goal", icon: Rocket, type: "textarea", placeholder: "10-25 year goal..." },
  { key: "three_year_visual", label: "3-Year Visual", icon: TrendingUp, type: "textarea", placeholder: "What does your school look like in 3 years?" },
  { key: "one_year_goal", label: "1-Year Goal", icon: Calendar, type: "textarea", placeholder: "What must you achieve this year?" },
  { key: "ninety_day_project", label: "90-Day Project", icon: Lightbulb, type: "textarea", placeholder: "Current quarter focus..." },
  { key: "focus_of_the_year", label: "Focus of the Year", icon: Star, type: "textarea", placeholder: "One word or phrase that captures this year..." },
  { key: "parking_lot", label: "Parking Lot", icon: Lightbulb, type: "textarea", placeholder: "Ideas to revisit later..." },
];

export default function StrategicOrganizer() {
  const [form, setForm] = useState({});
  const [planId, setPlanId] = useState(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["strategic-plans"],
    queryFn: () => base44.entities.StrategicPlan.list(),
  });

  useEffect(() => {
    if (plans.length > 0) {
      const plan = plans[0];
      setPlanId(plan.id);
      setForm({
        school_name: plan.school_name || "",
        mission: plan.mission || "",
        values: plan.values || "",
        ideal_customer_profile: plan.ideal_customer_profile || "",
        bhag: plan.bhag || "",
        three_year_visual: plan.three_year_visual || "",
        one_year_goal: plan.one_year_goal || "",
        ninety_day_project: plan.ninety_day_project || "",
        parking_lot: plan.parking_lot || "",
        focus_of_the_year: plan.focus_of_the_year || "",
      });
    }
  }, [plans]);

  const handleSave = async () => {
    setSaving(true);
    if (planId) {
      await base44.entities.StrategicPlan.update(planId, form);
    } else {
      await base44.entities.StrategicPlan.create(form);
    }
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
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Strategic Organizer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Plan your school's strategic direction</p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
          Save
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.key} className={section.key === "school_name" ? "md:col-span-2" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  {section.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {section.type === "input" ? (
                  <Input
                    value={form[section.key] || ""}
                    onChange={(e) => setForm({ ...form, [section.key]: e.target.value })}
                    placeholder={section.placeholder}
                  />
                ) : (
                  <Textarea
                    value={form[section.key] || ""}
                    onChange={(e) => setForm({ ...form, [section.key]: e.target.value })}
                    placeholder={section.placeholder}
                    rows={4}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}