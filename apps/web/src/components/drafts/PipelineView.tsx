import { formatCurrency, truncate } from "@forager/shared";
import type { GrantOpportunity, GrantMatch, GrantStatus } from "@forager/shared";

interface PipelineViewProps {
  grants: GrantOpportunity[];
  matches: GrantMatch[];
  selectedGrantId: string | null;
  onSelectGrant: (id: string) => void;
}

const PIPELINE_COLUMNS: { status: GrantStatus; label: string; color: string }[] = [
  { status: "discovered", label: "Discovered", color: "var(--color-neutral-500)" },
  { status: "screening", label: "Screening", color: "var(--color-semantic-info)" },
  { status: "matched", label: "Matched", color: "var(--color-brand-primary)" },
  { status: "drafting", label: "Drafting", color: "var(--color-brand-accent-dark)" },
  { status: "submitted", label: "Submitted", color: "var(--color-semantic-warning)" },
  { status: "awarded", label: "Awarded", color: "var(--color-semantic-success)" },
];

function getMatchForGrant(
  grantId: string,
  matches: GrantMatch[]
): GrantMatch | undefined {
  return matches.find((m) => m.opportunity_id === grantId);
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "No deadline";
  const date = new Date(deadline);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return "Expired";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 14) return `${days} days left`;
  if (days <= 60) return `${Math.ceil(days / 7)} weeks left`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDeadlineUrgency(deadline: string | null): string {
  if (!deadline) return "";
  const days = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (days < 0) return "expired";
  if (days <= 7) return "urgent";
  if (days <= 30) return "soon";
  return "";
}

function getScoreColor(score: number): string {
  if (score >= 85) return "var(--color-semantic-success)";
  if (score >= 70) return "var(--color-brand-primary)";
  if (score >= 50) return "var(--color-semantic-warning)";
  return "var(--color-semantic-error)";
}

export function PipelineView({
  grants,
  matches,
  selectedGrantId,
  onSelectGrant,
}: PipelineViewProps) {
  return (
    <div className="pipeline">
      <div className="pipeline-columns">
        {PIPELINE_COLUMNS.map((col) => {
          const columnGrants = grants.filter((g) => g.status === col.status);
          return (
            <div className="pipeline-column" key={col.status}>
              <div className="column-header">
                <div className="column-header-left">
                  <span
                    className="column-dot"
                    style={{ background: col.color }}
                  />
                  <span className="column-label">{col.label}</span>
                </div>
                <span className="column-count">{columnGrants.length}</span>
              </div>
              <div className="column-cards">
                {columnGrants.map((grant) => {
                  const match = getMatchForGrant(grant.id, matches);
                  const urgency = getDeadlineUrgency(grant.deadline);
                  return (
                    <button
                      key={grant.id}
                      className={`grant-card ${selectedGrantId === grant.id ? "selected" : ""} ${urgency}`}
                      onClick={() => onSelectGrant(grant.id)}
                      id={`grant-${grant.id}`}
                    >
                      {/* Funder */}
                      <span className="grant-funder">
                        {truncate(grant.funder, 32)}
                      </span>

                      {/* Title */}
                      <h4 className="grant-title">
                        {truncate(grant.title, 60)}
                      </h4>

                      {/* Amount + Deadline Row */}
                      <div className="grant-meta">
                        <span className="grant-amount">
                          {grant.amount_min && grant.amount_max
                            ? `${formatCurrency(grant.amount_min)} – ${formatCurrency(grant.amount_max)}`
                            : "Amount TBD"}
                        </span>
                        <span className={`grant-deadline ${urgency}`}>
                          {formatDeadline(grant.deadline)}
                        </span>
                      </div>

                      {/* Match Score (if exists) */}
                      {match && (
                        <div className="grant-match-score">
                          <div className="score-bar-track">
                            <div
                              className="score-bar-fill"
                              style={{
                                width: `${match.score}%`,
                                background: getScoreColor(match.score),
                              }}
                            />
                          </div>
                          <span
                            className="score-value"
                            style={{ color: getScoreColor(match.score) }}
                          >
                            {match.score}
                          </span>
                        </div>
                      )}

                      {/* Tags */}
                      <div className="grant-tags">
                        {grant.tags.slice(0, 2).map((tag) => (
                          <span className="grant-tag" key={tag}>
                            {tag.replace(/_/g, " ")}
                          </span>
                        ))}
                        {grant.tags.length > 2 && (
                          <span className="grant-tag more">
                            +{grant.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {columnGrants.length === 0 && (
                  <div className="column-empty">
                    <span>No grants</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
