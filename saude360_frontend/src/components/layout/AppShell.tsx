/**
 * AppShell.tsx — Saúde 360 (reestruturado estilo agendacendap)
 * Layout com:
 *  - Desktop: sidebar lateral + topbar
 *  - Mobile: topbar + bottom nav fixa + padding inferior para não sobrepor o conteúdo
 */
import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export const AppShell = ({ children, title, subtitle }: AppShellProps) => {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar — apenas desktop */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle} />

        {/* Conteúdo principal — padding inferior em mobile para não sobrepor o BottomNav */}
        <main className="flex-1 px-4 lg:px-6 py-5 lg:py-8 pb-24 lg:pb-8 animate-fade-in max-w-screen-xl">
          {children}
        </main>
      </div>

      {/* Bottom Nav — apenas mobile */}
      <BottomNav />
    </div>
  );
};
