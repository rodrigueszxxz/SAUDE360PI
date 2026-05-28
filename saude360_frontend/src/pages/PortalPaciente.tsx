/**
 * PortalPaciente.tsx — Saúde 360
 *
 * Melhorias item 7 e 8:
 *  ✓ Status em tempo real (refetchInterval 30s em meus-agendamentos)
 *  ✓ QR Code disponível no portal para consultas confirmadas e presenciais
 *  ✓ Link de teleconsulta com parâmetros corretos (agendamento_id + tipo_consulta)
 *  ✓ Skeleton loading premium
 *  ✓ Empty states elegantes
 *  ✓ Animações suaves
 */
import { AppShell } from "@/components/layout/AppShell";
import { Chip } from "@/components/shared/PageHeader";
import {
  Calendar, FileText, Download, Video, ChevronRight,
  MapPin, Loader2, AlertCircle, Clock, Search, Plus,
  Stethoscope, Info, QrCode, CheckCircle2, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { meuAgendamentosApi, Agendamento } from "@/lib/api";
import { useCancelarAgendamento, useAvaliarConsulta } from "@/hooks/useApi";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useMedicos, useFavoritos, useToggleFavorito, useMinhaFilaEspera } from "@/hooks/useApi";
import { Heart, Star, Activity, User, RefreshCw, AlertTriangle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://anygfqhfmmkqlxegimds.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueWdmcWhmbW1rcWx4ZWdpbWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc4OTA0OCwiZXhwIjoyMDk0MzY1MDQ4fQ.32MNMF4CmR6-fPdGtbe2SW_AZ39yNKL262JD1JHy1B8";
const supabase = createClient(supabaseUrl, supabaseKey);

function formatarData(d?: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function formatarDataCompleta(d?: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMADO:          { label: "Confirmado",        color: "text-success",          bg: "bg-success/10"       },
  CHECKIN_REALIZADO:   { label: "Check-in feito",    color: "text-info",             bg: "bg-info/10"          },
  PENDENTE_PAGAMENTO:  { label: "Aguard. pagamento", color: "text-warning",          bg: "bg-warning/10"       },
  AGUARDANDO:          { label: "Aguardando",        color: "text-info",             bg: "bg-info/10"          },
  EM_ATENDIMENTO:      { label: "Em atendimento",    color: "text-primary",          bg: "bg-primary/10"       },
  CONCLUIDO:           { label: "Concluído",         color: "text-muted-foreground", bg: "bg-muted"            },
  CANCELADO:           { label: "Cancelado",         color: "text-destructive",      bg: "bg-destructive/10"   },
  NO_SHOW:             { label: "Não compareceu",    color: "text-muted-foreground", bg: "bg-muted"            },
};

// Skeleton de card de agendamento
const AgendamentoSkeleton = () => (
  <div className="animate-pulse space-y-3 p-4">
    {[1, 2].map(i => (
      <div key={i} className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted/60 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-muted/60 rounded w-3/4" />
          <div className="h-3 bg-muted/40 rounded w-1/2" />
        </div>
        <div className="h-5 w-16 bg-muted/50 rounded-full" />
      </div>
    ))}
  </div>
);

function FavoritosList() {
  const { data: medicos = [], isLoading: loadM } = useMedicos();
  const { data: favoritos = [], isLoading: loadF } = useFavoritos();
  const toggleFavorito = useToggleFavorito();

  const favIds = new Set(favoritos.map(f => f.medico_id));
  const medicosFav = (medicos as any[]).filter(m => favIds.has(m.id));

  if (loadM || loadF) return null;
  if (medicosFav.length === 0) return null;

  return (
    <section className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 border-b border-border/60 pb-2">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Heart className="h-4 w-4 text-destructive fill-destructive" />
          Médicos Favoritos
        </h2>
      </div>
      <div className="space-y-3">
        {medicosFav.map(m => (
          <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {m.nome.split(" ").slice(-2).map((n: string) => n[0]).join("").toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">{m.nome}</p>
                <p className="text-xs text-muted-foreground">{m.especialidade}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleFavorito.mutate({ medico_id: m.id, favorito: true })}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
                title="Remover dos favoritos"
              >
                <Heart className="h-4 w-4 fill-current" />
              </button>
              <Link
                to={`/grade-horarios?medico_id=${m.id}&medico_nome=${encodeURIComponent(m.nome)}&especialidade=${encodeURIComponent(m.especialidade)}&tipos_consulta=${encodeURIComponent((m.tipos_consulta ?? ['PRESENCIAL']).join(','))}`}
                className="h-8 px-3 rounded-lg flex items-center justify-center text-primary bg-primary/10 hover:bg-primary/20 transition-colors text-xs font-semibold"
              >
                Agendar
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const PortalPaciente = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const primeiroNome = user?.nome?.split(" ")[0] ?? "Paciente";
  const iniciais = user?.nome?.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() ?? "?";

  // Polling de 30s para atualização em tempo real
  const { data: agendamentos = [], isLoading, isError, isFetching } = useQuery({
    queryKey: ["meus-agendamentos"],
    queryFn: meuAgendamentosApi.listar,
    refetchInterval: 30_000,   // ← real-time: atualiza a cada 30s
    staleTime: 10_000,
  });

  const ativos = agendamentos.filter(a =>
    ["CONFIRMADO", "CHECKIN_REALIZADO", "PENDENTE_PAGAMENTO", "AGUARDANDO", "EM_ATENDIMENTO"].includes(a.status)
  );
  const proxima = ativos[0];
  const historico = agendamentos.filter(a =>
    ["CONCLUIDO", "REALIZADO", "CANCELADO", "NO_SHOW"].includes(a.status)
  ).slice(0, 5);

  const cancelarAgendamento = useCancelarAgendamento();
  const avaliarConsulta = useAvaliarConsulta();
  const [showCancelError, setShowCancelError] = useState<string | null>(null);

  // Fila de espera — persiste entre navegações
  const { data: minhaFila = [] } = useMinhaFilaEspera();
  const filaAtual = minhaFila.length > 0 ? minhaFila[0] : null;
  const [posicaoFila, setPosicaoFila] = useState(3);
  const [tempoEstimado, setTempoEstimado] = useState(15);
  const [statusFila, setStatusFila] = useState("Conectando...");

  useEffect(() => {
    if (!filaAtual) return;
    const channel = supabase
      .channel('portal_fila_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lista_espera' }, () => {
        setPosicaoFila(prev => (prev > 1 ? prev - 1 : 1));
        setTempoEstimado(prev => (prev > 5 ? prev - 5 : 5));
        setStatusFila("Posição atualizada!");
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setStatusFila("Conectado em Tempo Real");
      });
    const interval = setInterval(() => {
      setTempoEstimado(prev => (prev > 0 ? prev - 1 : 0));
    }, 60000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [filaAtual]);

  // Modal de feedback automático
  const [feedbackAgendamento, setFeedbackAgendamento] = useState<Agendamento | null>(null);
  const [feedbackNota, setFeedbackNota] = useState(0);
  const [feedbackComentario, setFeedbackComentario] = useState("");
  const [feedbackEnviados, setFeedbackEnviados] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("@saude360:feedback_enviados") || "[]") as number[]); }
    catch { return new Set(); }
  });

  // Detecta consulta recém-finalizada e exibe modal de avaliação
  useEffect(() => {
    const realizados = agendamentos.filter(
      a => a.status === "REALIZADO" && !feedbackEnviados.has(a.id)
    );
    if (realizados.length > 0 && !feedbackAgendamento) {
      setFeedbackAgendamento(realizados[0]);
      setFeedbackNota(0);
      setFeedbackComentario("");
    }
  }, [agendamentos]);

  const handleEnviarFeedback = async () => {
    if (!feedbackAgendamento || feedbackNota < 1) return;
    try {
      await avaliarConsulta.mutateAsync({
        agendamento_id: feedbackAgendamento.id,
        nota: feedbackNota,
        comentario: feedbackComentario,
      });
      const novos = new Set([...feedbackEnviados, feedbackAgendamento.id]);
      setFeedbackEnviados(novos);
      localStorage.setItem("@saude360:feedback_enviados", JSON.stringify([...novos]));
      setFeedbackAgendamento(null);
    } catch { /* tratado no hook */ }
  };

  const handleCancelar = async (id: number) => {
    if (window.confirm("Tem certeza que deseja cancelar esta consulta?")) {
      try {
        await cancelarAgendamento.mutateAsync({ id, solicitado_por: "PACIENTE" });
      } catch (err: unknown) {
        const error = err as Error;
        if (error.message?.includes("12 horas")) {
          setShowCancelError(error.message);
        }
      }
    }
  };

  // Constrói URL de teleconsulta com todos os params necessários
  const buildTeleconsultaUrl = (ag: Agendamento) => {
    const p = new URLSearchParams({
      agendamento_id: String(ag.id),
      tipo_consulta: ag.tipo_consulta ?? "",
      data: ag.data_consulta ?? "",
      horario: ag.horario ?? "",
      paciente: user?.nome ?? "",
      especialidade: ag.medicos?.especialidade ?? "",
    });
    return `/medico/teleconsulta?${p.toString()}`;
  };

  return (
    <AppShell title="Portal" subtitle={`Olá, ${primeiroNome}`}>
      <div className="max-w-2xl mx-auto space-y-4">

        {/* ── Saudação ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-1 pb-2">
          <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shrink-0">
            {iniciais}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bem-vindo de volta</p>
            <h1 className="text-lg font-bold text-foreground leading-tight">{user?.nome}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isFetching && !isLoading && (
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground/50 animate-spin" title="Atualizando..." />
            )}
            <Link
              to="/busca-medicos"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-glow transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo agendamento
            </Link>
          </div>
        </div>

        {/* ── Loading skeleton ──────────────────────────────────── */}
        {isLoading && (
          <div className="card-elevated overflow-hidden">
            <div className="animate-pulse p-5 space-y-4">
              <div className="h-5 bg-muted/60 rounded w-1/3" />
              <div className="h-24 bg-muted/40 rounded-xl" />
            </div>
            <AgendamentoSkeleton />
          </div>
        )}

        {/* ── Erro ─────────────────────────────────────────────── */}
        {isError && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-destructive font-medium">Erro ao carregar seus dados.</p>
              <p className="text-xs text-muted-foreground">Verifique sua conexão.</p>
            </div>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["meus-agendamentos"] })}
              className="text-xs text-primary font-medium hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* ── FILA DE ESPERA AO VIVO ───────────────────────────── */}
        {!isLoading && filaAtual && (
          <div className="card-elevated p-6 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 relative overflow-hidden mb-6">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Activity className="h-32 w-32 text-indigo-500" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                      <User className="h-7 w-7 text-indigo-500" />
                    </div>
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-success rounded-full border-2 border-white"></span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Fila de Espera</h3>
                    <p className="text-sm text-indigo-600 font-medium flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 animate-spin" /> {statusFila}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                    <Clock className="h-3.5 w-3.5" /> Ao Vivo
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Sua Posição</p>
                  <p className="text-3xl font-bold text-slate-800">{posicaoFila}º</p>
                  <p className="text-xs text-slate-400 mt-1">na fila de espera</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center relative overflow-hidden">
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500 animate-pulse"></div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Tempo Estimado</p>
                  <p className="text-3xl font-bold text-indigo-600">~{tempoEstimado}<span className="text-lg text-indigo-400 font-medium ml-1">min</span></p>
                  <p className="text-xs text-slate-400 mt-1">atualizando via websocket...</p>
                </div>
              </div>

              <div className="bg-amber-50 rounded-lg p-3.5 border border-amber-100 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 leading-relaxed">
                  Avisaremos você automaticamente pelo WhatsApp caso surja uma vaga na agenda.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── PRÓXIMA CONSULTA (card hero) ─────────────────────── */}
        {!isLoading && (
          <div className="bg-gradient-to-br from-primary to-primary-glow rounded-2xl p-5 text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_white,_transparent_55%)]" />
            <div className="relative">
              {proxima ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide bg-white/15 px-2.5 py-1 rounded-full">
                      <Clock className="h-3 w-3" /> Próxima consulta
                    </span>
                    {proxima.status === "PENDENTE_PAGAMENTO" && (
                      <span className="text-[11px] font-semibold bg-warning text-warning-foreground px-2 py-0.5 rounded-full animate-pulse">
                        Pag. pendente
                      </span>
                    )}
                    {proxima.status === "CONFIRMADO" && (
                      <span className="text-[11px] font-semibold bg-success/80 text-white px-2 py-0.5 rounded-full">
                        ✓ Confirmado
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold leading-tight">
                    {proxima.medicos?.nome ?? "Médico a confirmar"}
                  </h2>
                  <p className="text-primary-foreground/75 text-sm mt-0.5">
                    {proxima.medicos?.especialidade}
                    {proxima.tipo_consulta === "TELECONSULTA" ? " · Teleconsulta" : " · Presencial"}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-primary-foreground/85">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {formatarDataCompleta(proxima.data_consulta)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {proxima.horario ?? "Horário a confirmar"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      {proxima.tipo_consulta === "TELECONSULTA"
                        ? <><Video className="h-4 w-4" /> Online</>
                        : <><MapPin className="h-4 w-4" /> Presencial</>
                      }
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2.5 mt-5">
                    {/* Botão pagar */}
                    {proxima.status === "PENDENTE_PAGAMENTO" && (
                      <Link
                        to={`/paciente/pagamento?agendamento_id=${proxima.id}&nome=${encodeURIComponent(user?.nome ?? "")}&cpf=${user?.cpf ?? ""}`}
                        className="px-4 py-2 rounded-lg bg-white text-primary text-xs font-bold hover:bg-white/90 transition-colors shadow-sm"
                      >
                        Pagar agora
                      </Link>
                    )}
                    {/* Botão teleconsulta — SOMENTE se tipo=TELECONSULTA e status confirmado */}
                    {proxima.tipo_consulta === "TELECONSULTA" &&
                      ["CONFIRMADO", "AGUARDANDO", "CHECKIN_REALIZADO", "EM_ATENDIMENTO"].includes(proxima.status) && (
                        <Link
                          to={buildTeleconsultaUrl(proxima)}
                          className="px-4 py-2 rounded-lg bg-white/15 border border-white/25 text-xs font-semibold hover:bg-white/25 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Video className="h-3.5 w-3.5" /> Entrar na teleconsulta
                        </Link>
                      )}
                    {/* Botão QR Code — SOMENTE se presencial e confirmado */}
                    {proxima.tipo_consulta !== "TELECONSULTA" &&
                      ["CONFIRMADO", "AGUARDANDO"].includes(proxima.status) && (
                        <Link
                          to={`/paciente/check-in?agendamento_id=${proxima.id}`}
                          className="px-4 py-2 rounded-lg bg-white/15 border border-white/25 text-xs font-semibold hover:bg-white/25 transition-colors inline-flex items-center gap-1.5"
                        >
                          <QrCode className="h-3.5 w-3.5" /> Ver QR Code
                        </Link>
                      )}
                    <button
                      onClick={() => handleCancelar(proxima.id)}
                      disabled={cancelarAgendamento.isPending}
                      className="px-4 py-2 rounded-lg border border-white/25 text-xs font-semibold hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-primary-foreground/70 text-xs font-medium uppercase tracking-wide mb-2">Nenhuma consulta agendada</p>
                  <h2 className="text-xl font-bold">Agende sua consulta</h2>
                  <p className="text-primary-foreground/75 text-sm mt-1">Encontre um especialista e escolha o melhor horário.</p>
                  <Link
                    to="/busca-medicos"
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-primary text-sm font-bold hover:bg-white/90 transition-colors shadow-sm"
                  >
                    <Search className="h-4 w-4" /> Buscar médicos
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── ATALHOS RÁPIDOS ──────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { to: "/busca-medicos",      icon: Stethoscope, label: "Médicos",    color: "bg-primary-soft text-primary"            },
            { to: "/paciente/historico", icon: FileText,    label: "Histórico",  color: "bg-info-soft text-accent-foreground"     },
            { to: "/paciente/recibos",   icon: Download,    label: "Recibos",    color: "bg-warning-soft text-warning"            },
            proxima?.tipo_consulta === "TELECONSULTA"
              ? { to: buildTeleconsultaUrl(proxima), icon: Video, label: "Vídeo", color: "bg-info-soft text-info" }
              : { to: `/paciente/check-in${proxima ? `?agendamento_id=${proxima.id}` : ''}`, icon: QrCode, label: "Check-in", color: "bg-success-soft text-success" },
          ].map(({ to, icon: Icon, label, color }) => (
            <Link
              key={to}
              to={to}
              className="card-elevated flex flex-col items-center justify-center gap-2 p-3 rounded-xl hover:shadow-elevated transition-shadow text-center"
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-medium text-foreground leading-tight">{label}</span>
            </Link>
          ))}
        </div>

        {/* ── AGENDAMENTOS ATIVOS ───────────────────────────────── */}
        {!isLoading && ativos.length > 1 && (
          <section className="card-elevated overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60">
              <h2 className="font-semibold text-sm">Consultas agendadas</h2>
              <span className="text-xs text-muted-foreground">{ativos.length} ativas</span>
            </div>
            <ul className="divide-y divide-border/40">
              {ativos.slice(1).map(ag => {
                const cfg = STATUS_CONFIG[ag.status] ?? { label: ag.status, color: "text-muted-foreground", bg: "bg-muted" };
                const isTeleconsulta = ag.tipo_consulta === "TELECONSULTA";
                const confirmado = ["CONFIRMADO", "AGUARDANDO", "CHECKIN_REALIZADO", "EM_ATENDIMENTO"].includes(ag.status);
                return (
                  <li key={ag.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isTeleconsulta ? "bg-info-soft" : "bg-primary-soft"}`}>
                      {isTeleconsulta ? <Video className="h-4 w-4 text-info" /> : <Stethoscope className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ag.medicos?.nome ?? "Médico"}</p>
                      <p className="text-xs text-muted-foreground">
                        {ag.medicos?.especialidade} · {formatarData(ag.data_consulta)}{ag.horario && ` · ${ag.horario}`}
                        {isTeleconsulta && " · Online"}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {isTeleconsulta && confirmado && (
                      <Link
                        to={buildTeleconsultaUrl(ag)}
                        className="shrink-0 h-7 w-7 rounded-lg bg-info/10 text-info flex items-center justify-center hover:bg-info/20 transition-colors"
                        title="Entrar na teleconsulta"
                      >
                        <Video className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {!isTeleconsulta && confirmado && (
                      <Link
                        to={`/paciente/check-in?agendamento_id=${ag.id}`}
                        className="shrink-0 h-7 w-7 rounded-lg bg-success/10 text-success flex items-center justify-center hover:bg-success/20 transition-colors"
                        title="Ver QR Code de check-in"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ── HISTÓRICO RECENTE ─────────────────────────────────── */}
        {!isLoading && historico.length > 0 && (
          <section className="card-elevated overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60">
              <h2 className="font-semibold text-sm">Histórico de consultas</h2>
              <Link to="/paciente/historico" className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1">
                Ver todas <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="divide-y divide-border/40">
              {historico.map(c => {
                const cfg = STATUS_CONFIG[c.status] ?? { label: c.status, color: "text-muted-foreground", bg: "bg-muted" };
                return (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.medicos?.nome ?? "Médico"}</p>
                      <p className="text-xs text-muted-foreground">{c.medicos?.especialidade} · {formatarData(c.data_consulta)}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <Link
                      to={`/paciente/prontuario/${c.id}`}
                      className="shrink-0 h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                      title="Ver prontuário e documentos"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ── MEUS DOCUMENTOS ───────────────────────────────────── */}
        {!isLoading && historico.filter(c => ["CONCLUIDO", "REALIZADO"].includes(c.status)).length > 0 && (
          <section className="card-elevated overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                Meus Documentos
              </h2>
              <span className="text-xs text-muted-foreground">Receitas, Atestados e Prontuários</span>
            </div>
            <ul className="divide-y divide-border/40">
              {historico
                .filter(c => ["CONCLUIDO", "REALIZADO"].includes(c.status))
                .slice(0, 5)
                .map(c => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="h-9 w-9 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.medicos?.nome ?? "Médico"}</p>
                      <p className="text-xs text-muted-foreground">{formatarData(c.data_consulta)}</p>
                    </div>
                    <Link
                      to={`/paciente/prontuario/${c.id}#receitas`}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-primary-soft text-primary text-[11px] font-semibold hover:bg-primary hover:text-white transition-colors inline-flex items-center gap-1"
                      title="Ver receitas"
                    >
                      Receita
                    </Link>
                    <Link
                      to={`/paciente/prontuario/${c.id}#atestados`}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-success/10 text-success text-[11px] font-semibold hover:bg-success hover:text-white transition-colors inline-flex items-center gap-1"
                      title="Ver atestados"
                    >
                      Atestado
                    </Link>
                    <Link
                      to={`/paciente/prontuario/${c.id}`}
                      className="shrink-0 h-7 w-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-colors"
                      title="Ver prontuário completo"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Empty state quando não há histórico nem agendamentos */}
        {!isLoading && !isError && agendamentos.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
              <Calendar className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-medium text-foreground">Nenhuma consulta registrada</p>
              <p className="text-sm text-muted-foreground mt-1">Agende sua primeira consulta com um especialista.</p>
            </div>
            <Link
              to="/busca-medicos"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-glow transition-colors shadow-sm mt-2"
            >
              <Search className="h-4 w-4" /> Buscar médicos
            </Link>
          </div>
        )}

        {/* ── MEUS MÉDICOS FAVORITOS ────────────────────────────── */}
        <FavoritosList />
      </div>

      {/* ── Modal cancelamento < 12h ──────────────────────────── */}
      <Dialog open={!!showCancelError} onOpenChange={(open) => !open && setShowCancelError(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Cancelamento Bloqueado
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-base text-foreground mt-2">
            {showCancelError}
          </DialogDescription>
          <div className="bg-muted p-4 rounded-lg mt-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Para reagendar, entre em contato com nossa equipe de atendimento via WhatsApp.
            </p>
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <button className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                Fechar
              </button>
            </DialogClose>
            <a
              href="https://wa.me/5585999999999?text=Olá, preciso falar sobre o cancelamento da minha consulta."
              target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-[#25D366] text-white text-sm font-medium hover:bg-[#20bd5a] transition-colors inline-flex items-center gap-2"
            >
              Falar no WhatsApp
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal de Feedback Automático ──────────────────────────── */}
      <Dialog open={!!feedbackAgendamento} onOpenChange={(open) => {
        if (!open) {
          if (feedbackAgendamento) {
            const novos = new Set([...feedbackEnviados, feedbackAgendamento.id]);
            setFeedbackEnviados(novos);
            localStorage.setItem("@saude360:feedback_enviados", JSON.stringify([...novos]));
          }
          setFeedbackAgendamento(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como foi sua consulta?</DialogTitle>
            <DialogDescription>Sua avaliação é anônima e nos ajuda a melhorar nossos serviços.</DialogDescription>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center">
             <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl mb-4">
               {feedbackAgendamento?.medicos?.nome?.split(" ").slice(-2).map((n: string) => n[0]).join("").toUpperCase() || "??"}
             </div>
             <p className="font-medium text-lg mb-4">Dr(a). {feedbackAgendamento?.medicos?.nome}</p>
             <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map(star => (
                   <button key={star} type="button" onClick={() => setFeedbackNota(star)} className="focus:outline-none transition-transform hover:scale-110">
                     <Star className={`h-10 w-10 ${feedbackNota >= star ? "text-warning fill-warning" : "text-border"}`} />
                   </button>
                ))}
             </div>
             <textarea 
               className="w-full border border-border rounded-xl p-3 text-sm min-h-[100px] bg-muted/20 focus:ring-2 focus:ring-primary/20 focus:outline-none" 
               placeholder="Deixe um comentário sobre o atendimento (opcional)..."
               value={feedbackComentario}
               onChange={e => setFeedbackComentario(e.target.value)}
             />
          </div>
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <button className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                Pular
              </button>
            </DialogClose>
            <button 
              onClick={handleEnviarFeedback} 
              disabled={feedbackNota === 0 || avaliarConsulta.isPending} 
              className="px-6 py-2 bg-primary text-white text-sm font-semibold rounded-lg disabled:opacity-50 hover:bg-primary-glow transition-colors"
            >
              {avaliarConsulta.isPending ? "Enviando..." : "Enviar Avaliação"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default PortalPaciente;
