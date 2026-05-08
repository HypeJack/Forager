import type { AgentRun } from "@forager/shared";

interface AgentActivityFeedProps {
  runs: AgentRun[];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusIcon(status: string) {
  switch (status) {
    case "completed":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
    case "running":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      );
    case "failed":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
  }
}

export function AgentActivityFeed({ runs }: AgentActivityFeedProps) {
  const sortedRuns = [...runs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="activity-feed">
      <div className="activity-list">
        {sortedRuns.map((run) => {
          const output = run.output as Record<string, unknown> | null;
          const confidence = output?.confidence as number | undefined;
          const reasoning = output?.reasoning as string | undefined;

          return (
            <div className={`activity-card status-${run.status}`} key={run.id} id={`run-${run.id}`}>
              <div className="activity-icon-wrap">
                <div className={`activity-status-icon ${run.status}`}>
                  {statusIcon(run.status)}
                </div>
                <div className="activity-timeline-line" />
              </div>

              <div className="activity-content">
                <div className="activity-header">
                  <div className="activity-header-left">
                    <span className="activity-agent-type">
                      {run.agent_type.charAt(0).toUpperCase() + run.agent_type.slice(1)} Agent
                    </span>
                    <span className={`activity-status-badge ${run.status}`}>
                      {run.status === "running" && <span className="pulse-dot" />}
                      {run.status}
                    </span>
                  </div>
                  <span className="activity-time">{formatTime(run.created_at)}</span>
                </div>

                {reasoning && (
                  <p className="activity-reasoning">{reasoning}</p>
                )}

                <div className="activity-meta">
                  <span className="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8M12 17v4" />
                    </svg>
                    {run.model}
                  </span>
                  {run.tokens_used > 0 && (
                    <span className="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                      </svg>
                      {run.tokens_used.toLocaleString()} tokens
                    </span>
                  )}
                  {run.duration_ms && (
                    <span className="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      {(run.duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                  {confidence !== undefined && (
                    <span className="meta-item confidence">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <path d="M22 4L12 14.01l-3-3" />
                      </svg>
                      {Math.round(confidence * 100)}% confidence
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
