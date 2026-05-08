import { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import type { AgentRun } from "@forager/shared";

export function AgentActivityPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("slug", slug).single();
      if (!tenant) return;

      const { data } = await supabase
        .from("agent_runs")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (data) setRuns(data as AgentRun[]);
      setLoading(false);
    }
    loadData();

    // Live subscription
    const channel = supabase.channel('agent_runs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_runs' }, () => {
         loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  if (loading) {
     return <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-neutral-900">Agent Activity Log</h1>
        <p className="text-sm text-neutral-500 mt-1">Live traces of all Forager agents operating in your workspace.</p>
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-16 border border-neutral-200 rounded-xl bg-surface-card">
          <p className="text-sm font-medium text-neutral-800">No agent activity yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <div key={run.id} className="bg-surface-card border border-neutral-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    run.status === 'completed' ? 'bg-semantic-success/10 text-semantic-success' :
                    run.status === 'failed' ? 'bg-semantic-error/10 text-semantic-error' :
                    'bg-brand-primary/10 text-brand-primary animate-pulse'
                  }`}>
                     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                       {run.status === 'completed' && <path d="M20 6L9 17l-5-5" />}
                       {run.status === 'failed' && <path d="M18 6L6 18M6 6l12 12" />}
                       {run.status === 'running' && <circle cx="12" cy="12" r="5" />}
                     </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 capitalize">{run.agent_type} Agent</h3>
                    <p className="text-xs text-neutral-500">Triggered by {run.triggered_by === 'system' ? 'System' : 'User'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">{run.status}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{new Date(run.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-3 text-xs text-neutral-600 font-mono flex flex-wrap gap-4">
                <div><span className="text-neutral-400">Model:</span> {run.model || 'pending'}</div>
                <div><span className="text-neutral-400">Tokens:</span> {run.tokens_used.toLocaleString()}</div>
                {run.duration_ms && <div><span className="text-neutral-400">Duration:</span> {(run.duration_ms/1000).toFixed(1)}s</div>}
              </div>
              
              {run.error && (
                <div className="mt-3 text-xs text-semantic-error bg-semantic-error/5 p-3 rounded-lg border border-semantic-error/20">
                  {run.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
