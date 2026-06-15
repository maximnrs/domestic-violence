type SidebarProps = {
  activePath: string;
  onNavigate: (path: string) => void;
};

const navItems = [
  { label: "Cases", path: "/cases" },
  { label: "Report Requests", path: "/reports/new" },
  { label: "Reports", path: "/reports" },
  { label: "Users", path: "/users" },
  { label: "Settings", path: "/settings" },
];

export function Sidebar({ activePath, onNavigate }: SidebarProps) {
  function isActive(path: string) {
    if (path === "/cases") {
      return activePath === "/cases" || activePath.startsWith("/cases/");
    }

    if (path === "/reports/new") {
      return activePath.startsWith("/reports/new");
    }

    return activePath === path;
  }

  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark">n</div>
        <div>
          <strong>nura</strong>
          <span>Legal Dashboard</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={isActive(item.path) ? "active" : ""}
            type="button"
            onClick={() => onNavigate(item.path)}
          >
            <span className="nav-icon" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="avatar">LA</div>
        <div>
          <strong>Legal Authority</strong>
          <span>Officer</span>
        </div>
      </div>
    </aside>
  );
}
