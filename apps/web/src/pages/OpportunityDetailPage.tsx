import { useState, useEffect } from "react";
import { useParams, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { PreDraftModal } from "@/components/PreDraftModal";
import { useAuth } from "@/hooks/useAuth";
import type { GrantOpportunity, GrantMatch } from "@forager/shared";

const MILESTONES = [
  { id: "released", label: "Released" },
  { id: "webinar", label: "Webinar" },
  { id: "qa", label: "Q&A Deadline" },
  { id: "loi", label: "LOI Due" },
  { id: "full_proposal", label: "Full Proposal" }
];

export function OpportunityDetailPage() {
  const { id, slug } = useParams({ strict: false }) as { id: string, slug?: string };
  const router = useRouter();
  const { user } = useAuth();
  const [opp, setOpp] = useState<GrantOpportunity | null>(null);
  const [match, setMatch] = useState<GrantMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreDraft, setShowPreDraft] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Resolve tenant for the pre-draft modal
  useEffect(() => {
    if (!user) return;
    supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single()
      .then(({ data }) => data && setTenantId(data.tenant_id));
  }, [user]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      const { data: oppData } = await supabase.from("grant_opportunities").select("*").eq("id", id).single();
      if (oppData) setOpp(oppData as GrantOpportunity);

      const { data: matchData } = await supabase.from("grant_matches").select("*").eq("opportunity_id", id).single();
      if (matchData) setMatch(matchData as GrantMatch);
      
      setLoading(false);
    }
    loadData();
  }, [id]);

  const handleMilestoneChange = async (milestoneId: string, value: string) => {
    if (!opp) return;
    const currentMilestones = (opp as any).milestones || {};
    const newMilestones = { ...currentMilestones, [milestoneId]: value || null };
    
    // Optimistic
    setOpp({ ...opp, milestones: newMilestones } as any);
    await supabase.from("grant_opportunities").update({ milestones: newMilestones }).eq("id", opp.id);
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!opp) {
    return <div className="p-8 text-center text-neutral-500">Opportunity not found.</div>;
  }

  const basePath = slug ? `/org/${slug}` : "";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link to={`${basePath}/opportunities`} className="inline-flex items-center gap-2 text-sm font-medium text-brand-primary hover:underline mb-6">
        &larr; Back to Feed
      </Link>
      
      <div className="flex gap-8 items-start">
        {/* Main Content (Left) */}
        <div className="flex-1 min-w-0">
          <div className="bg-surface-card border border-neutral-200 rounded-xl p-6 mb-6 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-semibold text-brand-primary mb-1 uppercase tracking-wider">{opp.funder}</p>
              <h1 className="font-serif text-3xl font-bold text-neutral-900 leading-tight">{opp.title}</h1>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-neutral-600 mb-6 bg-neutral-50 p-4 rounded-lg border border-neutral-100">
               {opp.amount_max && <div><strong>Max Award:</strong> ${opp.amount_max.toLocaleString()}</div>}
               {opp.deadline && <div><strong>Deadline:</strong> {new Date(opp.deadline).toLocaleDateString()}</div>}
               <a href={opp.url} target="_blank" rel="noreferrer" className="text-semantic-info hover:underline font-medium">View original source &nearr;</a>
            </div>

            <div className="prose prose-sm text-neutral-800 max-w-none mb-8 leading-relaxed">
              <p>{opp.description}</p>
            </div>

            <button
              onClick={() => setShowPreDraft(true)}
              className="px-6 py-3 text-sm font-bold rounded-lg bg-brand-primary text-white hover:bg-brand-primary-light transition-colors shadow-sm"
            >
              Start Draft with Architect →
            </button>
          </div>

          {/* Why This Match */}
          {match && (
            <div className="bg-surface-card border border-brand-primary/20 rounded-xl overflow-hidden mb-6 shadow-sm">
              <div className="bg-brand-primary/5 px-6 py-4 border-b border-brand-primary/10 flex justify-between items-center">
                <h2 className="font-serif text-xl font-bold text-brand-primary-dark">Why this match?</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-brand-primary-dark uppercase tracking-wider">Scout Score</span>
                  <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold shadow-sm">
                    {match.score}
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-neutral-800 leading-relaxed mb-6">{match.rationale}</p>
                
                {(match as any).eligibility_rationale && (
                  <div className="mb-6 p-5 bg-neutral-50 rounded-xl border border-neutral-200">
                    <h3 className="text-xs font-bold text-neutral-900 mb-2 uppercase tracking-wider">Eligibility Check</h3>
                    <p className="text-sm text-neutral-700 leading-relaxed">{(match as any).eligibility_rationale}</p>
                  </div>
                )}
                
                {match.evidence && match.evidence.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 mb-3 uppercase tracking-wider">Evidence from Vault</h3>
                    <div className="space-y-3">
                      {match.evidence.map((cit, idx) => (
                        <div key={idx} className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
                          <p className="text-sm text-neutral-700 mb-3 italic">"{cit.excerpt}"</p>
                          <div className="flex justify-between items-center">
                             <p className="text-xs font-medium text-neutral-500">Relevance: {cit.relevance}</p>
                             <p className="text-xs font-semibold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-md">{cit.source}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Rail: Milestones */}
        <aside className="w-80 flex-shrink-0">
          <div className="bg-surface-card border border-neutral-200 rounded-xl p-5 sticky top-6 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-neutral-900 mb-4">Milestone Tracker</h3>
            
            <div className="space-y-5 relative before:absolute before:inset-0 before:ml-[11px] before:w-0.5 before:-translate-x-px before:bg-neutral-200">
              {MILESTONES.map((m, idx) => {
                const milestones = (opp as any).milestones || {};
                const value = milestones[m.id] || "";
                const isCompleted = !!value;
                
                return (
                  <div key={m.id} className="relative flex items-start gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 mt-0.5 transition-colors ${isCompleted ? 'bg-brand-primary border-brand-primary text-white' : 'bg-white border-neutral-300'}`}>
                      {isCompleted && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className={`block text-sm font-semibold mb-1 ${isCompleted ? 'text-neutral-900' : 'text-neutral-500'}`}>{m.label}</label>
                      <input 
                        type="date"
                        value={value}
                        onChange={(e) => handleMilestoneChange(m.id, e.target.value)}
                        className="w-full text-sm border-neutral-200 rounded-md bg-neutral-50 focus:bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all p-2"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {showPreDraft && tenantId && (
        <PreDraftModal
          opportunityId={opp.id}
          opportunityTitle={opp.title}
          tenantId={tenantId}
          onCreated={(appId) => router.navigate({ to: `${basePath}/drafts/${appId}` })}
          onClose={() => setShowPreDraft(false)}
        />
      )}
    </div>
  );
}
