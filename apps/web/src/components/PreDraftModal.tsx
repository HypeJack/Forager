import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { ApplicationOutlineSection } from "@forager/db/src/queries/applications";

// Default RFP outline sections — user can add/remove in this modal
const DEFAULT_SECTIONS: ApplicationOutlineSection[] = [
  { id: "executive-summary", title: "Executive Summary", status: "pending", content: null },
  { id: "org-background", title: "Organization Background & Capacity", status: "pending", content: null },
  { id: "statement-of-need", title: "Statement of Need", status: "pending", content: null },
  { id: "project-description", title: "Project Description & Goals", status: "pending", content: null },
  { id: "evaluation", title: "Evaluation Plan", status: "pending", content: null },
  { id: "budget-narrative", title: "Budget Narrative", status: "pending", content: null },
];

interface PreDraftModalProps {
  opportunityId: string;
  opportunityTitle: string;
  tenantId: string;
  onCreated: (applicationId: string) => void;
  onClose: () => void;
}

export function PreDraftModal({
  opportunityId,
  opportunityTitle,
  tenantId,
  onCreated,
  onClose,
}: PreDraftModalProps) {
  const [sections, setSections] = useState<ApplicationOutlineSection[]>(DEFAULT_SECTIONS);
  const [matchPriorVoice, setMatchPriorVoice] = useState(true);
  const [creating, setCreating] = useState(false);

  function toggleSection(id: string) {
    setSections((prev) =>
      prev.map((s) => s.id === id ? { ...s, _excluded: !(s as any)._excluded } : s)
    );
  }

  async function handleCreate() {
    setCreating(true);

    const activeOutline = sections.filter((s) => !(s as any)._excluded);

    const { data, error } = await supabase
      .from("grant_applications")
      .insert({
        tenant_id: tenantId,
        opportunity_id: opportunityId,
        outline: activeOutline,
        match_prior_voice: matchPriorVoice,
        status: "pre_draft",
      })
      .select("id")
      .single();

    setCreating(false);

    if (!error && data) {
      onCreated(data.id);
    } else {
      console.error("Failed to create application:", error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay">
      <div className="bg-surface-card border border-neutral-200 rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-100">
          <h2 className="font-serif text-xl font-bold text-neutral-950">Set Up Draft</h2>
          <p className="text-sm text-neutral-500 mt-0.5 line-clamp-1">{opportunityTitle}</p>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Section Selection */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">Sections to Draft</h3>
            <div className="space-y-2">
              {sections.map((section) => {
                const excluded = (section as any)._excluded;
                return (
                  <label
                    key={section.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors",
                      excluded
                        ? "border-neutral-200 bg-neutral-50 opacity-50"
                        : "border-brand-primary/20 bg-brand-primary/5"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={!excluded}
                      onChange={() => toggleSection(section.id)}
                      className="w-4 h-4 rounded accent-brand-primary"
                    />
                    <span className="text-sm font-medium text-neutral-800">{section.title}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Voice Setting */}
          <div className="border border-neutral-200 rounded-xl p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-neutral-800">Match my prior winning proposals</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Architect will write in your organization's authentic voice, learned from your Vault.
                </p>
              </div>
              {/* Toggle switch */}
              <button
                role="switch"
                aria-checked={matchPriorVoice}
                onClick={() => setMatchPriorVoice((v) => !v)}
                className={cn(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2",
                  matchPriorVoice ? "bg-brand-primary" : "bg-neutral-300"
                )}
                id="toggle-match-voice"
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    matchPriorVoice ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-neutral-50 border-t border-neutral-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || sections.filter((s) => !(s as any)._excluded).length === 0}
            id="btn-start-draft"
            className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-brand-primary text-white hover:bg-brand-primary-light transition-colors disabled:opacity-50"
          >
            {creating ? "Creating..." : "Start Draft →"}
          </button>
        </div>
      </div>
    </div>
  );
}
