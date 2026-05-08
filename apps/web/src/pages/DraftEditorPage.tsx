import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { GrantApplication, ApplicationOutlineSection } from "@forager/db/src/queries/applications";
import type { GrantOpportunity } from "@forager/shared";

// ── Citation pill rendering ────────────────────────────────────
// Architect embeds [[Source: Document Title]] markers in the stream.
// We render them as inline pills.
function renderWithCitations(text: string) {
  const parts = text.split(/(\[\[Source:[^\]]+\]\])/g);
  return parts.map((part, i) => {
    const match = part.match(/\[\[Source:([^\]]+)\]\]/);
    if (match) {
      return (
        <span
          key={i}
          className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-accent/20 text-brand-primary-dark border border-brand-accent/30"
          title={`Source: ${match[1].trim()}`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          </svg>
          {match[1].trim()}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Status badge ───────────────────────────────────────────────
const SECTION_STATUS = {
  pending: { label: "Pending", className: "bg-neutral-100 text-neutral-500" },
  drafting: { label: "Drafting…", className: "bg-semantic-info/10 text-semantic-info animate-pulse" },
  complete: { label: "Done", className: "bg-semantic-success/10 text-semantic-success" },
};

export function DraftEditorPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const router = useRouter();

  const [application, setApplication] = useState<GrantApplication | null>(null);
  const [opportunity, setOpportunity] = useState<GrantOpportunity | null>(null);
  const [loading, setLoading] = useState(true);

  // Live streaming state — keyed by sectionId
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({});
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Librarian context (from DB results embedded in application or separately fetched)
  const [librarianContext, setLibrarianContext] = useState<Array<{
    documentTitle: string;
    content: string;
    hybridScore: number;
  }>>([]);

  const [showSubmission, setShowSubmission] = useState(false);
  const centerRef = useRef<HTMLDivElement>(null);

  // ── Load application ─────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: app } = await supabase
        .from("grant_applications")
        .select("*")
        .eq("id", id)
        .single();

      if (app) {
        setApplication(app as GrantApplication);
        setSelectedSectionId(app.outline[0]?.id ?? null);

        // Load opportunity
        const { data: opp } = await supabase
          .from("grant_opportunities")
          .select("*")
          .eq("id", app.opportunity_id)
          .single();

        if (opp) setOpportunity(opp as GrantOpportunity);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  // ── Subscribe to Architect Realtime broadcast ─────────────────
  useEffect(() => {
    if (!id) return;

    const channel = supabase.channel(`architect:${id}`);

    channel
      .on("broadcast", { event: "token" }, ({ payload }) => {
        const token: string = payload.token;
        setStreamingContent((prev) => {
          if (!activeSectionId) return prev;
          return { ...prev, [activeSectionId]: (prev[activeSectionId] ?? "") + token };
        });
      })
      .on("broadcast", { event: "section_complete" }, ({ payload }) => {
        const { sectionId } = payload;
        // Reload application to get the persisted content
        supabase
          .from("grant_applications")
          .select("*")
          .eq("id", id)
          .single()
          .then(({ data }) => {
            if (data) setApplication(data as GrantApplication);
          });
        setActiveSectionId(null);
        setStreamingContent((prev) => ({ ...prev, [sectionId]: "" }));
      })
      .on("broadcast", { event: "draft_complete" }, () => {
        setApplication((prev) =>
          prev ? { ...prev, status: "complete" } : prev
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, activeSectionId]);

  // ── Trigger a section draft ───────────────────────────────────
  async function handleDraftSection(sectionId: string) {
    if (!application) return;

    // Get user's tenant
    const { data: { user } } = await supabase.auth.getUser();
    const { data: userData } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user!.id)
      .single();

    setActiveSectionId(sectionId);
    setSelectedSectionId(sectionId);

    // Update outline status in local state optimistically
    setApplication((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        outline: prev.outline.map((s) =>
          s.id === sectionId ? { ...s, status: "drafting" } : s
        ),
      };
    });

    // Emit Inngest event to start the Architect worker
    await supabase.functions.invoke("emit-inngest-event", {
      body: {
        name: "architect/draft.requested",
        data: {
          applicationId: id,
          sectionId,
          tenantId: userData?.tenant_id,
          plan: "nonprofit", // TODO: derive from tenant plan
        },
      },
    });
  }

  // ── Pause Architect ───────────────────────────────────────────
  async function handlePause() {
    await supabase
      .from("grant_applications")
      .update({ status: "paused", current_section: null })
      .eq("id", id);
    setActiveSectionId(null);
    setApplication((prev) => (prev ? { ...prev, status: "paused" } : prev));
  }

  // ── Resolve displayed content for a section ───────────────────
  function getSectionContent(section: ApplicationOutlineSection): string {
    // Prefer: DB content (complete) → live stream buffer
    return section.content ?? streamingContent[section.id] ?? "";
  }

  const selectedSection = application?.outline.find(
    (s) => s.id === selectedSectionId
  ) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!application) {
    return <div className="p-8 text-center text-neutral-500">Application not found.</div>;
  }

  if (showSubmission) {
    return (
      <SubmissionScreen
        application={application}
        opportunityUrl={opportunity?.url ?? ""}
        onBack={() => setShowSubmission(false)}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-background">
      {/* ── Left Pane: Outline ─────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-surface-card border-r border-neutral-200 flex flex-col">
        <div className="px-4 py-4 border-b border-neutral-100">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Draft</p>
          <h2 className="font-serif text-base font-bold text-neutral-900 leading-tight line-clamp-2">
            {opportunity?.title ?? "Grant Application"}
          </h2>
        </div>

        {/* Section list */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {application.outline.map((section, i) => {
            const statusCfg = SECTION_STATUS[section.status];
            const isSelected = section.id === selectedSectionId;
            return (
              <button
                key={section.id}
                onClick={() => setSelectedSectionId(section.id)}
                id={`outline-${section.id}`}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg transition-colors",
                  isSelected
                    ? "bg-brand-primary/8 border border-brand-primary/20"
                    : "hover:bg-neutral-50"
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs text-neutral-400 mt-0.5 w-4 flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium leading-tight",
                      isSelected ? "text-brand-primary-dark" : "text-neutral-700"
                    )}>
                      {section.title}
                    </p>
                    <span className={cn("inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full font-medium", statusCfg.className)}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Pause button */}
        <div className="p-3 border-t border-neutral-100">
          {application.status === "complete" ? (
            <button
              onClick={() => setShowSubmission(true)}
              id="btn-proceed-submission"
              className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg bg-brand-primary text-white hover:bg-brand-primary-light transition-colors"
            >
              Proceed to Submission →
            </button>
          ) : (
            <button
              onClick={handlePause}
              disabled={!activeSectionId}
              id="btn-pause-architect"
              className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#A8453A", color: "#FFFFFF" }}
            >
              Pause Architect
            </button>
          )}
        </div>
      </aside>

      {/* ── Center Pane: Draft ─────────────────────────────────── */}
      <main ref={centerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-10">
          {selectedSection ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="font-serif text-2xl font-bold text-neutral-950">
                  {selectedSection.title}
                </h1>
                {selectedSection.status === "pending" && (
                  <button
                    onClick={() => handleDraftSection(selectedSection.id)}
                    id={`btn-draft-${selectedSection.id}`}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-primary text-white hover:bg-brand-primary-light transition-colors"
                  >
                    Draft This Section
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="prose max-w-none">
                {getSectionContent(selectedSection) ? (
                  <p
                    className="text-neutral-800 leading-relaxed"
                    style={{ fontFamily: "var(--font-serif)", fontSize: "1.0625rem", lineHeight: "1.8" }}
                  >
                    {renderWithCitations(getSectionContent(selectedSection))}
                    {/* Streaming cursor */}
                    {selectedSection.status === "drafting" && (
                      <span className="inline-block w-0.5 h-5 bg-brand-primary ml-0.5 animate-pulse align-middle" />
                    )}
                  </p>
                ) : (
                  <div className="text-center py-16 border-2 border-dashed border-neutral-200 rounded-xl">
                    <p className="text-neutral-400 text-sm">
                      {selectedSection.status === "drafting"
                        ? "Architect is writing…"
                        : "Click \"Draft This Section\" to begin."}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-neutral-400 text-center mt-20">Select a section from the outline.</p>
          )}
        </div>
      </main>

      {/* ── Right Pane: Librarian Context ──────────────────────── */}
      <aside className="w-72 flex-shrink-0 bg-surface-card border-l border-neutral-200 overflow-y-auto">
        <div className="px-4 py-4 border-b border-neutral-100 sticky top-0 bg-surface-card z-10">
          <h3 className="text-sm font-semibold text-neutral-700">Librarian Context</h3>
          <p className="text-xs text-neutral-400 mt-0.5">Passages retrieved from your Vault</p>
        </div>

        <div className="p-3 space-y-3">
          {librarianContext.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-8">
              Context will appear when a section is being drafted.
            </p>
          ) : (
            librarianContext.map((ctx, i) => (
              <div
                key={i}
                className="bg-surface-background border border-neutral-100 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  </svg>
                  <span className="text-xs font-semibold text-brand-primary truncate">
                    {ctx.documentTitle}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed line-clamp-4 italic">
                  "{ctx.content}"
                </p>
                <div className="mt-2 flex items-center justify-end">
                  <span className="text-xs text-neutral-400">
                    Score: {(ctx.hybridScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

// ── Submission Screen (inline component) ──────────────────────

interface SubmissionScreenProps {
  application: GrantApplication;
  opportunityUrl: string;
  onBack: () => void;
}

function SubmissionScreen({ application, opportunityUrl, onBack }: SubmissionScreenProps) {
  const [submitted, setSubmitted] = useState(false);

  async function handleChoice(via: "portal" | "manual" | "final") {
    await supabase
      .from("grant_applications")
      .update({
        status: via === "final" ? "complete" : "submitted",
        submitted_via: via,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (via === "portal" && opportunityUrl) {
      window.open(opportunityUrl, "_blank", "noopener,noreferrer");
    }

    setSubmitted(true);
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <button onClick={onBack} className="text-sm text-brand-primary hover:underline mb-6 inline-flex items-center gap-1">
        ← Back to Draft
      </button>

      <h1 className="font-serif text-2xl font-bold text-neutral-950 mb-2">Submission</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Forager does not submit on your behalf. Choose how you are proceeding.
      </p>

      {submitted ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-semantic-success/10 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-semantic-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <p className="font-semibold text-neutral-900">Status updated.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Option 1: Submit via portal */}
          <button
            onClick={() => handleChoice("portal")}
            id="btn-submit-portal"
            className="w-full text-left px-5 py-4 rounded-xl border-2 border-brand-primary/30 bg-brand-primary/5 hover:border-brand-primary hover:bg-brand-primary/10 transition-all"
          >
            <p className="font-semibold text-brand-primary-dark">Submit via funder portal</p>
            <p className="text-sm text-neutral-500 mt-0.5">Opens the funder's website in a new tab. We'll record today as your submission date.</p>
          </button>

          {/* Option 2: Mark submitted manually */}
          <button
            onClick={() => handleChoice("manual")}
            id="btn-submit-manual"
            className="w-full text-left px-5 py-4 rounded-xl border-2 border-neutral-200 hover:border-neutral-400 transition-all"
          >
            <p className="font-semibold text-neutral-800">Mark as submitted manually</p>
            <p className="text-sm text-neutral-500 mt-0.5">You've already submitted through another channel. Records today as submitted.</p>
          </button>

          {/* Option 3: Save as final */}
          <button
            onClick={() => handleChoice("final")}
            id="btn-save-final"
            className="w-full text-left px-5 py-4 rounded-xl border-2 border-neutral-200 hover:border-neutral-400 transition-all"
          >
            <p className="font-semibold text-neutral-800">Save as final</p>
            <p className="text-sm text-neutral-500 mt-0.5">Draft is complete but not yet submitted. Saved for your records.</p>
          </button>
        </div>
      )}
    </div>
  );
}
