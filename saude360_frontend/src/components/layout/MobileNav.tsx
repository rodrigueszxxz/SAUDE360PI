import { NavLink } from "react-router-dom";
import { X, HeartPulse, LayoutDashboard, Stethoscope, Calendar, FileText, Video, CheckCircle2, ListChecks, Users, Search, Clock, Wallet, History, Activity, BarChart3, MessageSquareHeart, UserCog, Sparkles } from "lucide-react";
import { useEffect } from "react";

const items = [
  { to: "/", label: "Hub", icon: LayoutDashboard },
  { to: "/painel-medico", label: "Painel do Médico", icon: Stethoscope },
  { to: "/portal-paciente", label: "Portal do Paciente", icon: HeartPulse },
  { to: "/painel-recepcao", label: "Recepção", icon: UserCog },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/teleconsulta", label: "Teleconsulta", icon: Video },
  { to: "/check-in", label: "Check-in", icon: CheckCircle2 },
  { to: "/lista-espera", label: "Lista de Espera", icon: ListChecks },
  { to: "/dados-paciente", label: "Dados do Paciente", icon: Users },
  { to: "/busca-medicos", label: "Busca Médicos", icon: Search },
  { to: "/grade-horarios", label: "Grade Horários", icon: Clock },
  { to: "/selecao-horario", label: "Seleção Horário", icon: Clock },
  { to: "/confirmacao", label: "Confirmação", icon: CheckCircle2 },
  { to: "/pagamento", label: "Pagamento", icon: Wallet },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/indicadores", label: "Indicadores", icon: Activity },
  { to: "/linha-tempo", label: "Linha do Tempo", icon: MessageSquareHeart },
  { to: "/kpis", label: "KPIs", icon: BarChart3 },
];

export const MobileNav = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-foreground/40 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside className={`absolute left-0 top-0 h-full w-72 bg-card border-r border-border shadow-hero transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Saúde 360" className="h-8 object-contain" />
            <p className="text-sm font-semibold">Saúde 360</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="overflow-y-auto h-[calc(100%-4rem)] p-3 space-y-1 scroll-hide">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive ? "bg-primary-soft text-primary font-medium" : "text-sidebar-foreground hover:bg-muted"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  );
};
