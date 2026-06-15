import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

type LegalDashboardLayoutProps = {
  title: string;
  activePath: string;
  children: ReactNode;
  onNavigate: (path: string) => void;
};

export function LegalDashboardLayout({
  title,
  activePath,
  children,
  onNavigate,
}: LegalDashboardLayoutProps) {
  return (
    <div className="dashboard-shell">
      <Sidebar activePath={activePath} onNavigate={onNavigate} />
      <main className="dashboard-main">
        <TopBar title={title} />
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
