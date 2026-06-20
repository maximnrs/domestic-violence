import type { ReactNode } from "react";
import type { UserResponse } from "../services/api";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

type LegalDashboardLayoutProps = {
  title: string;
  activePath: string;
  currentUser: UserResponse | null;
  children: ReactNode;
  onNavigate: (path: string) => void;
};

export function LegalDashboardLayout({
  title,
  activePath,
  currentUser,
  children,
  onNavigate,
}: LegalDashboardLayoutProps) {
  return (
    <div className="dashboard-shell">
      <Sidebar activePath={activePath} currentUser={currentUser} onNavigate={onNavigate} />
      <main className="dashboard-main">
        <TopBar title={title} currentUser={currentUser} />
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
