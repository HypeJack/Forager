import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface OrgProfile {
  tenant_id: string;
  name: string;
  mission: string;
  focus_areas: string[];
  annual_budget: number | null;
  location: string;
  org_type: string;
  ein: string;
  website: string;
}

const ORG_TYPES = ["nonprofit", "government", "tribal", "education", "other"] as const;

export function OrgProfilePage() {
  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load profile on mount
  useEffect(() => {
    async function loadProfile() {
      const { data, error } = await supabase
        .from("org_profiles")
        .select("*")
        .limit(1)
        .single();

      if (data) setProfile(data as OrgProfile);
      setLoading(false);
    }
    loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from("org_profiles")
      .upsert(profile, { onConflict: "tenant_id" });

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  function updateField<K extends keyof OrgProfile>(key: K, value: OrgProfile[K]) {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-neutral-950">Organization Profile</h1>
        <p className="text-sm text-neutral-500 mt-1">
          This information helps Forager's Scout agent find grants aligned with your mission.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="org-name" className="block text-sm font-medium text-neutral-700 mb-1.5">Organization Name</label>
          <input
            id="org-name"
            type="text"
            value={profile?.name ?? ""}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg bg-surface-background text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
          />
        </div>

        {/* Mission */}
        <div>
          <label htmlFor="mission" className="block text-sm font-medium text-neutral-700 mb-1.5">Mission Statement</label>
          <textarea
            id="mission"
            rows={4}
            value={profile?.mission ?? ""}
            onChange={(e) => updateField("mission", e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg bg-surface-background text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary resize-none"
          />
        </div>

        {/* Two-column row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="org-type" className="block text-sm font-medium text-neutral-700 mb-1.5">Organization Type</label>
            <select
              id="org-type"
              value={profile?.org_type ?? ""}
              onChange={(e) => updateField("org_type", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg bg-surface-background text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            >
              <option value="">Select...</option>
              {ORG_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="annual-budget" className="block text-sm font-medium text-neutral-700 mb-1.5">Annual Budget ($)</label>
            <input
              id="annual-budget"
              type="number"
              value={profile?.annual_budget ?? ""}
              onChange={(e) => updateField("annual_budget", e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg bg-surface-background text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-neutral-700 mb-1.5">Location</label>
          <input
            id="location"
            type="text"
            value={profile?.location ?? ""}
            onChange={(e) => updateField("location", e.target.value)}
            placeholder="e.g., Western Colorado"
            className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg bg-surface-background text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
          />
        </div>

        {/* Focus Areas */}
        <div>
          <label htmlFor="focus-areas" className="block text-sm font-medium text-neutral-700 mb-1.5">
            Focus Areas <span className="text-neutral-400 font-normal">(comma-separated)</span>
          </label>
          <input
            id="focus-areas"
            type="text"
            value={(profile?.focus_areas ?? []).join(", ")}
            onChange={(e) => updateField("focus_areas", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            placeholder="community_health, behavioral_health"
            className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg bg-surface-background text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
          />
        </div>

        {/* Two-column row: EIN + Website */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="ein" className="block text-sm font-medium text-neutral-700 mb-1.5">EIN</label>
            <input
              id="ein"
              type="text"
              value={profile?.ein ?? ""}
              onChange={(e) => updateField("ein", e.target.value)}
              placeholder="XX-XXXXXXX"
              className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg bg-surface-background text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
          </div>
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-neutral-700 mb-1.5">Website</label>
            <input
              id="website"
              type="url"
              value={profile?.website ?? ""}
              onChange={(e) => updateField("website", e.target.value)}
              placeholder="https://sunrisehealth.org"
              className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg bg-surface-background text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            id="btn-save-profile"
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-brand-primary text-white hover:bg-brand-primary-light transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
          {saved && (
            <span className="text-sm text-semantic-success font-medium animate-in fade-in">
              ✓ Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
