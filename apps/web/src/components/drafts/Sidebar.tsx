import { APP_NAME } from "@forager/shared";

interface SidebarProps {
  currentView: "pipeline" | "activity";
  onViewChange: (view: "pipeline" | "activity") => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  currentView,
  onViewChange,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="var(--color-brand-primary)" />
              <path
                d="M16 6C12.5 6 10 8.5 10 11.5C10 14.5 12 16 14 17.5C14.5 17.9 15 18.3 15 19V22H17V19C17 18.3 17.5 17.9 18 17.5C20 16 22 14.5 22 11.5C22 8.5 19.5 6 16 6Z"
                fill="var(--color-brand-accent)"
              />
              <path
                d="M14 24H18V25C18 25.6 17.6 26 17 26H15C14.4 26 14 25.6 14 25V24Z"
                fill="var(--color-brand-accent)"
                opacity="0.7"
              />
            </svg>
          </div>
          {!collapsed && <span className="sidebar-logo-text">{APP_NAME}</span>}
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          id="sidebar-toggle"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {collapsed ? (
              <path d="M9 18l6-6-6-6" />
            ) : (
              <path d="M15 18l-6-6 6-6" />
            )}
          </svg>
        </button>
      </div>

      {/* Tenant Badge */}
      {!collapsed && (
        <div className="sidebar-tenant">
          <div className="tenant-avatar">SC</div>
          <div className="tenant-info">
            <span className="tenant-name">Sunrise Community</span>
            <span className="tenant-plan">Pro Plan</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          {!collapsed && <span className="nav-section-label">Workspace</span>}
          <button
            className={`nav-item ${currentView === "pipeline" ? "active" : ""}`}
            onClick={() => onViewChange("pipeline")}
            id="nav-pipeline"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            {!collapsed && <span>Pipeline</span>}
          </button>

          <button
            className={`nav-item ${currentView === "activity" ? "active" : ""}`}
            onClick={() => onViewChange("activity")}
            id="nav-activity"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            {!collapsed && <span>Agent Activity</span>}
            {!collapsed && <span className="nav-badge">1</span>}
          </button>
        </div>

        <div className="nav-section">
          {!collapsed && <span className="nav-section-label">Coming Soon</span>}
          <button className="nav-item disabled" disabled id="nav-documents">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            {!collapsed && <span>Documents</span>}
          </button>

          <button className="nav-item disabled" disabled id="nav-team">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            {!collapsed && <span>Team</span>}
          </button>

          <button className="nav-item disabled" disabled id="nav-settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            {!collapsed && <span>Settings</span>}
          </button>
        </div>
      </nav>

      {/* User */}
      {!collapsed && (
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">MG</div>
            <div className="user-info">
              <span className="user-name">Maria Gonzalez</span>
              <span className="user-role">Owner</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
