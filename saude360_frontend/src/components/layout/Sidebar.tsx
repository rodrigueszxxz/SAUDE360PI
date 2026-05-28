/**
 * Sidebar.tsx — Saúde 360
 * Exibe apenas as rotas permitidas para o papel do usuário autenticado.
 * Paciente NUNCA vê links do médico ou admin.
 */
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Calendar, FileText, Users, Stethoscope, Activity,
  Search, Clock, History, Wallet, CheckCircle2, Video, ClipboardList,
  BarChart3, HeartPulse, Receipt, Sparkles, LogOut, UserCircle,
  ListChecks, UserCog
} from "lucide-react";
import { useAuth, Role } from "@/context/AuthContext";

// ─── Navegação por papel ──────────────────────────────────────────────────────
const navPorPapel: Record<Role, { label: string; items: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[] }[]> = {
  paciente: [
    {
      label: "Minha Saúde",
      items: [
        { to: "/paciente/portal",       label: "Início",              icon: LayoutDashboard },
        { to: "/paciente/historico",    label: "Meus Documentos",     icon: FileText },
        { to: "/paciente/linha-tempo",  label: "Linha do Tempo",      icon: Activity },
        { to: "/paciente/recibos",      label: "Recibos",             icon: Receipt },
      ],
    },
    {
      label: "Consultas",
      items: [
        { to: "/busca-medicos",            label: "Buscar Médico",     icon: Search },
        { to: "/paciente/check-in",        label: "Check-in",          icon: CheckCircle2 },
        { to: "/paciente/teleconsulta",    label: "Teleconsulta",      icon: Video },
      ],
    },
  ],

  medico: [
    {
      label: "Clínico",
      items: [
        { to: "/medico/painel",        label: "Painel",               icon: Stethoscope },
        { to: "/medico/agenda",        label: "Minha Agenda",         icon: Calendar },
        { to: "/medico/teleconsulta",  label: "Teleconsulta",         icon: Video },
        { to: "/paciente/meus-dados",  label: "Meus Dados",           icon: UserCircle },
      ],
    },
  ],

  admin: [
    {
      label: "Administração",
      items: [
        { to: "/admin/painel",         label: "Painel da Recepção",   icon: UserCog },
        { to: "/admin/lista-espera",   label: "Lista de Espera",      icon: ListChecks },
        { to: "/admin/indicadores",    label: "Indicadores",          icon: Activity },
        { to: "/admin/kpis",           label: "KPIs",                 icon: BarChart3 },
      ],
    },
    {
      label: "Financeiro",
      items: [
        { to: "/admin/relatorio-financeiro", label: "Relatório Financeiro", icon: Wallet },
      ],
    },
  ],
};

const papelLabel: Record<Role, string> = {
  paciente: "Paciente",
  medico:   "Médico",
  admin:    "Administração",
};

export const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const grupos = navPorPapel[user.papel] ?? [];

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
        <img src="/logo.png" alt="Saúde 360" className="h-8 object-contain" />
        <div>
          <p className="text-sm font-semibold text-foreground leading-tight">Saúde 360</p>
          <p className="text-[11px] text-muted-foreground leading-tight">{papelLabel[user.papel]}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scroll-hide">
        {grupos.map((g) => (
          <div key={g.label}>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {g.label}
            </p>
            <ul className="space-y-0.5">
              {g.items.map(({ to, label, icon: Icon }) => {
                const active = location.pathname === to;
                return (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                      {label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Rodapé com usuário */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
          <div className="h-8 w-8 rounded-full bg-primary-soft text-primary flex items-center justify-center font-semibold text-xs shrink-0">
            {user.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{user.nome}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className="text-muted-foreground hover:text-destructive transition-colors ml-auto shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
