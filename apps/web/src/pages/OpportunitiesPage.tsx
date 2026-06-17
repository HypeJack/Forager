import { useState, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { GrantOpportunity } from "@forager/shared";

type Tab = "discovered" | "watchlist" | "saved" | "dismissed";

export function OpportunitiesPage() {
  const { user } = useAuth();
  
  const [opportunities, setOpportunities] = useState<GrantOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningScout, setRunningScout] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("discovered");

  useEffect(() => {
    loadOpportunities(activeTab);
  }, [activeTab]);

  async function loadOpportunities(tab: Tab) {
    setLoading(true);
    let query = supabase
      .from("grant_opportunities")
      .select("*")
      .order("created_at", { ascending: false });

    // Handle tab filtering
    if (tab === "watchlist") {
      query = query.eq("is_watchlist", true);
    } else if (tab === "saved") {
      query = query.eq("is_saved", true);
    } else if (tab === "dismissed") {
      query = query.eq("is_dismissed", true);
    } else {
      // "discovered" tab shows items that are NOT saved and NOT dismissed
      query = query.eq("is_saved", false).eq("is_dismissed", false);
    }

    const { data } = await query;
    if (data) setOpportunities(data as GrantOpportunity[]);
    setLoading(false);
  }

  async function handleRunScout() {
    if (!user) return;
    setRunningScout(true);

    const { data: userData } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (userData) {
      const { error } = await supabase.rpc("trigger_scout_run", {
        p_tenant_id: userData.tenant_id
      });
      
      if (error) {
         alert("Failed to start Scout run. See console for details.");
      } else {
         alert("Scout agent run queued! Opportunities will populate shortly.");
      }
    }
    setRunningScout(false);
  }

  async function toggleFlag(id: string, flag: "is_watchlist" | "is_saved" | "is_dismissed", currentValue: boolean, e: React.MouseEvent) {
    e.preventDefault(); // Prevent navigating to detail page
    const newValue = !currentValue;
    
    // Optimistic update
    setOpportunities(prev => {
      if (activeTab === "discovered" && (flag === "is_saved" || flag === "is_dismissed") && newValue) {
        // Hide from discovered if saved or dismissed
        return prev.filter(o => o.id !== id);
      }
      return prev.map(o => o.id === id ? { ...o, [flag]: newValue } : o);
    });

    await supabase.from("grant_opportunities").update({ [flag]: newValue }).eq("id", id);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "discovered", label: "Discovered" },
    { id: "watchlist", label: "Watchlist" },
    { id: "saved", label: "Saved" },
    { id: "dismissed", label: "Dismissed" }
  ];


  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl font-bold text-neutral-950">Opportunities Feed</h1>
          <p className="text-sm text-neutral-500 mt-1">Grants discovered and scored by your Scout agent.</p>
        </div>
        <button
          onClick={handleRunScout}
          disabled={runningScout}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-brand-primary text-white hover:bg-brand-primary-light transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {runningScout ? "Queuing Scout..." : "Run Scout Agent"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-neutral-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-brand-primary text-brand-primary-dark"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-neutral-200 rounded-xl bg-surface-card">
          <p className="font-medium text-neutral-900 mb-1">No opportunities found in this view</p>
          <p className="text-sm text-neutral-500">Run the Scout agent or adjust your tabs.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {opportunities.map((opp) => {
            const isWatchlist = (opp as any).is_watchlist;
            const isSaved = (opp as any).is_saved;
            return (
              <Link
                key={opp.id}
                to="/opportunities/$id"
                params={{ id: opp.id }}
                className="block bg-surface-card border border-neutral-200 rounded-xl p-5 hover:border-brand-primary/30 hover:shadow-md transition-all relative group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="pr-20">
                    <p className="text-xs font-semibold text-brand-primary mb-1 uppercase tracking-wider">{opp.funder}</p>
                    <h3 className="text-lg font-bold text-neutral-900">{opp.title}</h3>
                  </div>
                  {/* Actions Top Right */}
                  <div className="flex items-center gap-2 absolute top-5 right-5">
                    <button 
                      onClick={(e) => toggleFlag(opp.id, "is_watchlist", isWatchlist, e)}
                      className={`p-1.5 rounded-md transition-colors ${isWatchlist ? 'text-semantic-warning bg-semantic-warning/10' : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600'}`}
                      title="Toggle Watchlist"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isWatchlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-neutral-600 line-clamp-2 mb-4">{opp.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm text-neutral-500">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      <span>
                        {opp.amount_max 
                          ? `$${(opp.amount_max / 1000).toFixed(0)}k max`
                          : "Amount unlisted"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>
                        {opp.deadline ? new Date(opp.deadline).toLocaleDateString() : "Rolling"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Bottom Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isSaved && activeTab !== "saved" && (
                       <button 
                         onClick={(e) => toggleFlag(opp.id, "is_saved", false, e)}
                         className="text-xs font-medium px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                       >
                         Save
                       </button>
                    )}
                    {activeTab !== "dismissed" && (
                       <button 
                         onClick={(e) => toggleFlag(opp.id, "is_dismissed", false, e)}
                         className="text-xs font-medium px-3 py-1.5 rounded-lg text-neutral-500 hover:text-semantic-error hover:bg-semantic-error/10 transition-colors"
                       >
                         Dismiss
                       </button>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
