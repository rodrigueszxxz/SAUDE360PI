/**
 * BottomNav.tsx — Saúde 360
 * Navbar inferior fixa (estilo agendacendap) para mobile e tablet.
 * Desktop usa a Sidebar lateral.
 */
import { NavLink, useLocation } from "react-router-dom";
import { Stethoscope, CalendarDays, UserCircle, FlaskConical, LayoutGrid } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface TabItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabsPaciente: TabItem[] = [
  { to: "/busca-medicos",      label: "Médicos",     icon: Stethoscope },
  { to: "/paciente/portal",   label: "Consultas",   icon: CalendarDays },
  { to: "/paciente/recibos",  label: "Recibos",     icon: FlaskConical },
  { to: "/paciente/meus-dados", label: "Perfil",    icon: UserCircle },
];

const tabsMedico: TabItem[] = [
  { to: "/medico/painel",     label: "Painel",      icon: LayoutGrid },
  { to: "/medico/agenda",     label: "Agenda",      icon: CalendarDays },
  { to: "/paciente/meus-dados", label: "Perfil",    icon: UserCircle },
];

const tabsAdmin: TabItem[] = [
  { to: "/admin/painel",               label: "Recepção",    icon: LayoutGrid },
  { to: "/admin/lista-espera",         label: "Espera",      icon: CalendarDays },
  { to: "/admin/relatorio-financeiro", label: "Financeiro",  icon: FlaskConical },
  { to: "/admin/kpis",                 label: "KPIs",        icon: UserCircle },
];

const tabsPublico: TabItem[] = [
  { to: "/busca-medicos", label: "Médicos",   icon: Stethoscope },
  { to: "/login",         label: "Entrar",    icon: UserCircle },
];

export const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  const tabs = !user
    ? tabsPublico
    : user.papel === "medico"
    ? tabsMedico
    : user.papel === "admin"
    ? tabsAdmin
    : tabsPaciente;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/60 safe-area-pb">
      <div className="flex items-stretch h-16">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || location.pathname.startsWith(to + "/");
          return (
            <NavLink
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors"
              style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
            >
              <Icon className={`h-5 w-5 transition-transform ${active ? "scale-110" : ""}`} />
              <span>{label}</span>
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
