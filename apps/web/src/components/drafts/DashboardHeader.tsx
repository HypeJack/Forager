interface DashboardHeaderProps {
  currentView: "pipeline" | "activity";
  grantCount: number;
}

export function DashboardHeader({ currentView, grantCount }: DashboardHeaderProps) {
  const titles: Record<string, { title: string; subtitle: string }> = {
    pipeline: {
      title: "Grant Pipeline",
      subtitle: `${grantCount} opportunities across all stages`,
    },
    activity: {
      title: "Agent Activity",
      subtitle: "Recent agent runs and their outputs",
    },
  };

  const { title, subtitle } = titles[currentView];

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-left">
        <h1 className="dashboard-title">{title}</h1>
        <p className="dashboard-subtitle">{subtitle}</p>
      </div>
      <div className="dashboard-header-right">
        <button className="btn-icon" id="btn-search" aria-label="Search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
        <button className="btn-icon" id="btn-notifications" aria-label="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span className="notification-dot" />
        </button>
        <button className="btn btn-sm btn-primary" id="btn-run-scout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Run Scout
        </button>
      </div>
    </header>
  );
}
