import { useState, useEffect } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/lib/supabase";
import type { GrantOpportunity, GrantMatch, GrantStatus } from "@forager/shared";
import { formatCurrency, truncate } from "@/lib/utils"; // Assuming these exist, else I'll inline them

const PIPELINE_COLUMNS: { id: string; statuses: GrantStatus[]; label: string; color: string }[] = [
  { id: "discovered", statuses: ["discovered"], label: "Discovered", color: "#6b7280" },
  { id: "evaluating", statuses: ["screening", "matched"], label: "Evaluating", color: "#3b82f6" },
  { id: "drafting", statuses: ["drafting"], label: "Drafting", color: "#8b5cf6" },
  { id: "submitted", statuses: ["submitted"], label: "Submitted", color: "#eab308" },
  { id: "closed", statuses: ["awarded", "rejected", "archived"], label: "Closed", color: "#22c55e" },
];

export function PipelinePage() {
  
  const [grants, setGrants] = useState<GrantOpportunity[]>([]);
  const [matches, setMatches] = useState<GrantMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: grantsData } = await supabase
        .from("grant_opportunities")
        .select("*");

      const { data: matchesData } = await supabase
        .from("grant_matches")
        .select("*");

      if (grantsData) setGrants(grantsData as GrantOpportunity[]);
      if (matchesData) setMatches(matchesData as GrantMatch[]);
      setLoading(false);
    }
    loadData();

    // Subscribe to changes
    const channel = supabase.channel('pipeline_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grant_opportunities' }, () => {
         loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    
    const sourceCol = result.source.droppableId;
    const destCol = result.destination.droppableId;
    
    if (sourceCol === destCol) return;

    const grantId = result.draggableId;
    
    // Map column ID to a default status for that column
    let newStatus: GrantStatus;
    switch (destCol) {
      case "discovered": newStatus = "discovered"; break;
      case "evaluating": newStatus = "screening"; break;
      case "drafting": newStatus = "drafting"; break;
      case "submitted": newStatus = "submitted"; break;
      case "closed": newStatus = "archived"; break;
      default: return;
    }

    // Optimistic UI update
    setGrants(prev => prev.map(g => g.id === grantId ? { ...g, status: newStatus } : g));

    // Persist
    await supabase.from("grant_opportunities").update({ status: newStatus }).eq("id", grantId);
  }

  if (loading) {
     return <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col bg-surface-background p-6">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-neutral-900">Pipeline</h1>
        <p className="text-sm text-neutral-500">Track and manage your grant lifecycle.</p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
          {PIPELINE_COLUMNS.map(col => {
            const columnGrants = grants.filter(g => col.statuses.includes(g.status));
            return (
              <div key={col.id} className="flex-shrink-0 w-80 flex flex-col bg-neutral-50/50 rounded-xl border border-neutral-200">
                <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50/80 rounded-t-xl flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                    <h3 className="font-semibold text-neutral-800 text-sm">{col.label}</h3>
                  </div>
                  <span className="text-xs font-medium bg-white px-2 py-0.5 rounded-full border border-neutral-200 text-neutral-500">
                    {columnGrants.length}
                  </span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      className={`flex-1 p-3 overflow-y-auto min-h-[200px] transition-colors ${snapshot.isDraggingOver ? 'bg-brand-primary/5' : ''}`}
                    >
                      {columnGrants.map((grant, index) => {
                        const match = matches.find(m => m.opportunity_id === grant.id);
                        return (
                          <Draggable key={grant.id} draggableId={grant.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mb-3 bg-white p-4 rounded-xl border transition-shadow ${snapshot.isDragging ? 'shadow-lg border-brand-primary/50' : 'border-neutral-200 shadow-sm hover:border-neutral-300'}`}
                              >
                                <p className="text-xs font-semibold text-brand-primary mb-1 uppercase tracking-wider line-clamp-1">{grant.funder}</p>
                                <h4 className="text-sm font-bold text-neutral-900 leading-snug mb-3 line-clamp-2">{grant.title}</h4>
                                
                                {match && (
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-brand-primary" style={{ width: `${match.score}%` }} />
                                    </div>
                                    <span className="text-xs font-bold text-brand-primary">{match.score}</span>
                                  </div>
                                )}
                                
                                <div className="flex justify-between items-center text-xs text-neutral-500">
                                  <span>{grant.amount_max ? `$${(grant.amount_max/1000).toFixed(0)}k` : 'TBD'}</span>
                                  <span>{grant.deadline ? new Date(grant.deadline).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'Rolling'}</span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
