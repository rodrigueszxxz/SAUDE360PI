import { Bell, Search, Menu, X, Calendar, CreditCard, CheckCircle2, User, LogOut, ChevronDown, CheckCheck } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/context/AuthContext";
import { useNotificacoes, useNotificacoesCount, useMarcarNotificacaoLida, useMarcarTodasLidas } from "@/hooks/useApi";
import type { Notificacao } from "@/lib/api";

interface TopbarProps {
  title?: string;
  subtitle?: string;
}

const TIPO_ICON: Record<string, JSX.Element> = {
  info:    <Calendar className="h-4 w-4 text-primary" />,
  success: <CheckCircle2 className="h-4 w-4 text-success" />,
  warning: <CreditCard className="h-4 w-4 text-warning" />,
  error:   <X className="h-4 w-4 text-destructive" />,
};

function formatarTempo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export const Topbar = ({ title, subtitle }: TopbarProps) => {
  const [navOpen, setNavOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const notifsRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Notificações reais do backend
  const { data: notificacoes = [] } = useNotificacoes();
  const { data: countData } = useNotificacoesCount();
  const marcarLida = useMarcarNotificacaoLida();
  const marcarTodasLidas = useMarcarTodasLidas();

  const naoLidas = countData?.count ?? notificacoes.filter(n => !n.lida).length;

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) {
        setNotifsOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClickNotif = (n: Notificacao) => {
    if (!n.lida) marcarLida.mutate(n.id);
    if (n.link) {
      setNotifsOpen(false);
      navigate(n.link);
    }
  };

  const iniciais = user?.nome
    ? user.nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
    : "?";

  const perfilLink = user?.papel === "paciente" ? "/paciente/meus-dados" : "#";
  const portalLink = user?.papel === "medico" ? "/medico/painel" : user?.papel === "admin" ? "/admin/painel" : "/paciente/portal";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 lg:px-8">
        <button
          aria-label="Abrir menu"
          onClick={() => setNavOpen(true)}
          className="lg:hidden h-10 w-10 inline-flex items-center justify-center rounded-lg border border-border/60 hover:bg-muted transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden md:block">
          {title && <h1 className="text-lg font-semibold leading-tight">{title}</h1>}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="flex-1 max-w-md ml-auto hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar médicos, especialidades..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/60 border border-transparent focus:border-primary/40 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/10 text-sm placeholder:text-muted-foreground transition-all"
            />
          </div>
        </div>

        {/* Notificações */}
        {user && (
          <div className="relative" ref={notifsRef}>
            <button
              onClick={() => setNotifsOpen(v => !v)}
              className="relative h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {naoLidas > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-destructive text-[9px] text-white flex items-center justify-center ring-2 ring-background font-bold animate-pulse">
                  {naoLidas > 9 ? "9+" : naoLidas}
                </span>
              )}
            </button>

            {notifsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-card rounded-xl border border-border shadow-elevated z-50 overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                  <h3 className="font-semibold text-sm">Notificações</h3>
                  <div className="flex gap-2 items-center">
                    {naoLidas > 0 && (
                      <button
                        onClick={() => marcarTodasLidas.mutate()}
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        title="Marcar todas como lidas"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Todas lidas
                      </button>
                    )}
                    <button onClick={() => setNotifsOpen(false)}
                      className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {notificacoes.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p>Nenhuma notificação</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/50 max-h-80 overflow-y-auto">
                    {notificacoes.map(n => (
                      <li
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors ${!n.lida ? "bg-primary/5" : ""}`}
                        onClick={() => handleClickNotif(n)}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          n.tipo === 'success' ? 'bg-success/10' :
                          n.tipo === 'warning' ? 'bg-warning/10' :
                          n.tipo === 'error'   ? 'bg-destructive/10' :
                          'bg-primary/10'
                        }`}>
                          {TIPO_ICON[n.tipo] ?? TIPO_ICON.info}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.lida ? "font-semibold" : "font-medium"}`}>{n.titulo}</p>
                          {n.mensagem && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensagem}</p>}
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{formatarTempo(n.criado_em)}</p>
                        </div>
                        {!n.lida && <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0 animate-pulse" />}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Avatar com dropdown */}
        <div className="relative" ref={avatarRef}>
          <button
            onClick={() => setAvatarOpen(v => !v)}
            className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-muted transition-colors"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="h-9 w-9 rounded-full object-cover border border-primary/20" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary-soft flex items-center justify-center text-primary font-semibold text-sm">
                {iniciais}
              </div>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          </button>

          {avatarOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-card rounded-xl border border-border shadow-elevated z-50 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-border/60">
                {user?.avatar && (
                  <img src={user.avatar} alt="foto" className="h-10 w-10 rounded-full object-cover mb-2 border border-primary/20" />
                )}
                <p className="text-sm font-semibold truncate">{user?.nome}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{user?.papel}</p>
              </div>
              <div className="py-1">
                <Link
                  to={perfilLink}
                  onClick={() => setAvatarOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Meus Dados
                </Link>
              </div>
              <div className="border-t border-border/60 py-1">
                <button
                  onClick={() => { setAvatarOpen(false); logout(); }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors w-full text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
    </>
  );
};
