import { formatCurrency } from "@forager/shared";
import type { GrantOpportunity, GrantMatch, Citation } from "@forager/shared";

interface GrantDetailPanelProps {
  grant: GrantOpportunity;
  match: GrantMatch | null;
  onClose: () => void;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function scoreLabel(s: number) {
  if (s >= 90) return "Excellent Match";
  if (s >= 70) return "Strong Match";
  if (s >= 50) return "Moderate Match";
  return "Weak Match";
}

function scoreColor(s: number) {
  if (s >= 85) return "var(--color-semantic-success)";
  if (s >= 70) return "var(--color-brand-primary)";
  if (s >= 50) return "var(--color-semantic-warning)";
  return "var(--color-semantic-error)";
}

export function GrantDetailPanel({ grant, match, onClose }: GrantDetailPanelProps) {
  const statusLabel = grant.status.charAt(0).toUpperCase() + grant.status.slice(1);
  const amountRange = grant.amount_min && grant.amount_max
    ? `${formatCurrency(grant.amount_min)} – ${formatCurrency(grant.amount_max)}`
    : "Not specified";

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <aside className="detail-panel" id="grant-detail-panel">
        <div className="panel-header">
          <div className="panel-header-top">
            <span className={`status-badge status-${grant.status}`}>{statusLabel}</span>
            <button className="panel-close" onClick={onClose} aria-label="Close" id="close-detail-panel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <h2 className="panel-title">{grant.title}</h2>
          <p className="panel-funder">{grant.funder}</p>
        </div>

        <div className="panel-body">
          <section className="panel-section">
            <h3 className="panel-section-title">Key Details</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Award Range</span>
                <span className="detail-value">{amountRange}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Deadline</span>
                <span className="detail-value">{formatDate(grant.deadline)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Source</span>
                <a href={grant.url} target="_blank" rel="noopener noreferrer" className="detail-link">View Listing ↗</a>
              </div>
              <div className="detail-item">
                <span className="detail-label">Categories</span>
                <div className="detail-tags">
                  {grant.tags.map((t) => <span className="grant-tag" key={t}>{t.replace(/_/g, " ")}</span>)}
                </div>
              </div>
            </div>
          </section>

          <section className="panel-section">
            <h3 className="panel-section-title">Description</h3>
            <p className="panel-description">{grant.description}</p>
          </section>

          {match ? (
            <section className="panel-section">
              <h3 className="panel-section-title">Scout Analysis</h3>
              <div className="match-score-display">
                <div className="score-circle" style={{ borderColor: scoreColor(match.score) }}>
                  <span className="score-number" style={{ color: scoreColor(match.score) }}>{match.score}</span>
                  <span className="score-max">/100</span>
                </div>
                <div className="score-meta">
                  <span className="score-label" style={{ color: scoreColor(match.score) }}>{scoreLabel(match.score)}</span>
                  <span className="score-status">Status: {match.status.charAt(0).toUpperCase() + match.status.slice(1)}</span>
                </div>
              </div>
              <div className="match-rationale"><p>{match.rationale}</p></div>
              {match.evidence.length > 0 && (
                <div className="match-evidence">
                  <h4 className="evidence-title">Evidence ({match.evidence.length} citations)</h4>
                  <div className="evidence-list">
                    {match.evidence.map((c: Citation, i: number) => (
                      <div className="evidence-card" key={i}>
                        <blockquote className="evidence-excerpt">"{c.excerpt}"</blockquote>
                        <p className="evidence-relevance">{c.relevance}</p>
                        <a href={c.source} target="_blank" rel="noopener noreferrer" className="evidence-source">
                          {new URL(c.source).hostname} ↗
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="panel-section">
              <div className="no-match">
                <p>No Scout analysis yet</p>
                <span>Run the Scout agent to evaluate this opportunity.</span>
              </div>
            </section>
          )}
        </div>

        <div className="panel-footer">
          <button className="btn btn-secondary btn-sm" id="btn-archive-grant">Archive</button>
          <button className="btn btn-primary btn-sm" id="btn-advance-grant">Advance Stage →</button>
        </div>
      </aside>
    </>
  );
}
