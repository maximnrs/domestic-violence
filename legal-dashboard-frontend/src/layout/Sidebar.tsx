import type { UserResponse } from "../services/api";
import { Icon } from "../components/ui/Icon";

type SidebarProps = {
  activePath: string;
  currentUser: UserResponse | null;
  onNavigate: (path: string) => void;
};

const navItems = [
  { label: "Cases", path: "/cases", icon: "folder" },
  { label: "Report Requests", path: "/reports/new", icon: "filePlus" },
  { label: "Reports", path: "/reports", icon: "fileText" },
  { label: "Users", path: "/users", icon: "users" },
  { label: "Settings", path: "/settings", icon: "settings" },
] as const;

function getUserDisplayName(user: UserResponse | null) {
  if (!user) {
    return "Loading user";
  }

  return `${user.first_name} ${user.last_name}`.trim() || user.email;
}

function getUserInitials(user: UserResponse | null) {
  if (!user) {
    return "LA";
  }

  const initials = [user.first_name, user.last_name]
    .map((name) => name?.[0])
    .filter(Boolean)
    .join("");

  return (initials || user.email.slice(0, 2)).toUpperCase();
}

export function Sidebar({ activePath, currentUser, onNavigate }: SidebarProps) {
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
        <div className="brand-mark">
          <Icon name="moon" size={22} />
        </div>
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
            <Icon name={item.icon} className="nav-icon" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="avatar">{getUserInitials(currentUser)}</div>
        <div>
          <strong>{getUserDisplayName(currentUser)}</strong>
          <span>{currentUser?.email ?? "Signing in..."}</span>
        </div>
      </div>
    </aside>
  );
}
