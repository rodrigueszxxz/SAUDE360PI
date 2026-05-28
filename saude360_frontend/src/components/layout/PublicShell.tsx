/**
 * PublicShell.tsx — Saúde 360 (reestruturado estilo agendacendap)
 * Header compacto + conteúdo centralizado + BottomNav mobile + footer
 */
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { HeartPulse, LogIn, UserPlus, User, LogOut, Settings, ChevronDown, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState, useRef, useEffect } from "react";
import { BottomNav } from "./BottomNav";

interface PublicShellProps {
  children: ReactNode;
}

export const PublicShell = ({ children }: PublicShellProps) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const iniciais = user?.nome
    ? user.nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
    : "?";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header compacto ──────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Saúde 360" className="h-8 object-contain" />
            <span className="text-base font-bold tracking-tight text-primary">Saúde 360</span>
          </Link>

          {/* Ações */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Notificação */}
                <button className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors relative">
                  <Bell className="h-4.5 w-4.5" />
                </button>

                {/* Avatar dropdown */}
                <div className="relative" ref={ref}>
                  <button
                    onClick={() => setDropdownOpen(v => !v)}
                    className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                      {iniciais}
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-card rounded-xl border border-border shadow-elevated z-50 overflow-hidden animate-fade-in">
                      <div className="px-4 py-3 border-b border-border/60 bg-primary-soft/30">
                        <p className="text-sm font-semibold truncate">{user.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          to={user.papel === "paciente" ? "/paciente/portal" : user.papel === "medico" ? "/medico/painel" : "/admin/painel"}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          Meu Portal
                        </Link>
                        <Link
                          to="/paciente/meus-dados"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                        >
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          Meus Dados
                        </Link>
                      </div>
                      <div className="border-t border-border/60 py-1">
                        <button
                          onClick={() => { setDropdownOpen(false); logout(); }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors w-full text-left"
                        >
                          <LogOut className="h-4 w-4" />
                          Sair
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Entrar</span>
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Criar conta</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Conteúdo ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-5 pb-24 lg:pb-6 animate-fade-in">
        {children}
      </main>

      {/* ── Footer minimalista ───────────────────────────────────── */}
      <footer className="hidden lg:block border-t border-border/60 py-5 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Saúde 360 — Plataforma de agendamento médico
        </p>
      </footer>

      {/* ── Bottom Nav mobile ────────────────────────────────────── */}
      <BottomNav />
    </div>
  );
};
