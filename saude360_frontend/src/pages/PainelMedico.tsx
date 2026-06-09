import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useAgendamentosHoje } from "@/hooks/useApi";
import { PageHeader, StatCard, Chip } from "@/components/shared/PageHeader";
import {
  Calendar, Users, ClipboardList, AlertTriangle,
  Phone, Video, ChevronRight, PlayCircle, Eye,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const STATUS_BADGE: Record<string, { label: string; variant: "success"|"warning"|"primary"|"destructive"|"muted"|"info" }> = {
  CONFIRMADO:        { label: "Confirmado",       variant: "success" },
  PENDENTE:          { label: "Pendente",          variant: "warning" },
  PENDENTE_PAGAMENTO:{ label: "Aguard. Pagto",     variant: "warning" },
  EM_ATENDIMENTO:    { label: "Em Atendimento",    variant: "primary" },
  REALIZADO:         { label: "Realizado",         variant: "muted" },
  CANCELADO:         { label: "Cancelado",         variant: "destructive" },
};

const PainelMedico = () => {
  const { user } = useAuth();
  const { data: agendamentos = [], isLoading } = useAgendamentosHoje();
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
  const navigate = useNavigate();

  const horaAtual = new Date().getHours();
  const saudacao = horaAtual < 12 ? "Bom dia" : horaAtual < 18 ? "Boa tarde" : "Boa noite";
  const hojeFormatado = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const proximoAgendamento = agendamentos.find(a => ["PENDENTE", "CONFIRMADO"].includes(a.status));
  const totalHoje = agendamentos.length;
  const totalConfirmadas = agendamentos.filter(a => a.status === 'CONFIRMADO').length;
  const totalRealizadas = agendamentos.filter(a => a.status === 'REALIZADO').length;
  const emAndamento = agendamentos.find(a => a.status === 'EM_ATENDIMENTO');

  return (
    <AppShell title="Painel do Médico" subtitle={`${hojeFormatado.charAt(0).toUpperCase() + hojeFormatado.slice(1)}`}>
      <PageHeader
        eyebrow="Hoje"
        title={`${saudacao}, ${user?.nome ?? "Médico"}`}
        description={`Você tem ${totalHoje} consultas agendadas para hoje.`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Consultas hoje" value={totalHoje.toString()} trend="Atualizado" trendDirection="neutral" icon={<Calendar className="h-5 w-5" />} accent="primary" />
        <StatCard label="Confirmadas" value={totalConfirmadas.toString()} trend="" trendDirection="up" icon={<Users className="h-5 w-5" />} accent="info" />
        <StatCard label="Realizadas" value={totalRealizadas.toString()} trend="Concluídas hoje" trendDirection="neutral" icon={<ClipboardList className="h-5 w-5" />} accent="success" />
        <StatCard label="Pendentes" value={agendamentos.filter(a => a.status === 'PENDENTE' || a.status === 'CONFIRMADO').length.toString()} trend="Aguardando" trendDirection="neutral" icon={<AlertTriangle className="h-5 w-5" />} accent="primary" />
      </div>

      {/* Alerta: paciente em atendimento */}
      {emAndamento && (
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-primary to-primary-glow text-white shadow-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-base border border-white/30 shrink-0">
              {emAndamento.nome?.split(" ").map((n: string) => n[0]).slice(0,2).join("") ?? "??"}
            </div>
            <div>
              <p className="font-bold text-base flex items-center gap-2">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span></span>
                {emAndamento.nome ?? "Paciente"} — Em atendimento
              </p>
              <p className="text-sm text-white/80 font-medium">{emAndamento.horario?.substring(0,5)} · {emAndamento.tipo_consulta}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/medico/atendimento/${emAndamento.id}`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-primary text-sm font-bold hover:bg-white/90 transition-colors shadow-sm shrink-0"
          >
            <PlayCircle className="h-4 w-4" /> Retomar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Agenda do dia */}
        <section className="xl:col-span-2 card-elevated min-h-[400px]">
          <div className="flex items-center justify-between p-5 border-b border-border/60">
            <div>
              <h2 className="font-semibold">Agenda do dia</h2>
              <p className="text-xs text-muted-foreground">{totalHoje} consultas marcadas</p>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando agenda...</div>
          ) : totalHoje === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhuma consulta agendada para hoje.</div>
          ) : (
            <ul className="divide-y divide-border/50 pb-20 lg:pb-0">
              {agendamentos.map(a => {
                const badge = STATUS_BADGE[a.status] ?? { label: a.status, variant: "muted" as const };
                const podeIniciar = ["CONFIRMADO", "PENDENTE"].includes(a.status);
                const jaAtendendo = a.status === "EM_ATENDIMENTO";
                const finalizado = a.status === "REALIZADO" || a.status === "CANCELADO";

                return (
                  <li key={a.id} className="flex items-center gap-4 px-6 py-5 hover:bg-muted/40 transition-colors relative group">
                    {/* Horário */}
                    <div className="text-center w-14 shrink-0">
                      <p className="text-base font-bold">{a.horario ? a.horario.substring(0, 5) : "—"}</p>
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">
                        {a.tipo_consulta === "TELECONSULTA" ? "Online" : "Presencial"}
                      </p>
                    </div>

                    {/* Avatar */}
                    <div className="h-12 w-12 rounded-full bg-primary-soft text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {a.nome ? a.nome.split(" ").map((n: string) => n[0]).slice(0,2).join("") : "??"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base truncate">{a.nome ?? "Paciente"}</p>
                      <p className="text-xs text-muted-foreground font-medium">{a.tipo_consulta}</p>
                    </div>

                    {/* Badge de status */}
                    <div className="hidden md:block shrink-0">
                      <Chip variant={badge.variant}>{badge.label}</Chip>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Videochamada para teleconsulta */}
                      {a.tipo_consulta === "TELECONSULTA" && !finalizado && (
                        <a
                          href="https://meet.google.com/new"
                          target="_blank"
                          rel="noreferrer"
                          className="h-10 w-10 rounded-xl border border-border hover:bg-muted flex items-center justify-center text-primary"
                          title="Iniciar videochamada"
                          onClick={e => e.stopPropagation()}
                        >
                          <Video className="h-5 w-5" />
                        </a>
                      )}

                      {/* Botão principal: Iniciar / Retomar / Ver */}
                      {podeIniciar && (
                        <button
                          onClick={() => navigate(`/medico/atendimento/${a.id}`)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary-glow transition-colors shadow-sm"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Iniciar
                        </button>
                      )}
                      {jaAtendendo && (
                        <button
                          onClick={() => navigate(`/medico/atendimento/${a.id}`)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-warning/80 text-warning-foreground text-sm font-bold hover:bg-warning transition-colors shadow-sm"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Retomar
                        </button>
                      )}
                      {finalizado && (
                        <button
                          onClick={() => navigate(`/medico/prontuario/${a.id}`)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-bold hover:bg-muted transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </button>
                      )}

                      {/* Dropdown extras */}
                      <div className="relative">
                        <button
                          onClick={() => setDropdownOpen(dropdownOpen === a.id ? null : a.id)}
                          className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground"
                        >
                          <ChevronRight className={`h-5 w-5 transition-transform ${dropdownOpen === a.id ? 'rotate-90' : ''}`} />
                        </button>

                        {dropdownOpen === a.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(null)} />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-card rounded-xl border border-border shadow-elevated z-50 py-1">
                              <button
                                className="w-full text-left px-4 py-2 text-sm hover:bg-muted"
                                onClick={() => { setDropdownOpen(null); navigate(`/medico/atendimento/${a.id}`); }}
                              >
                                {podeIniciar ? "Iniciar Atendimento" : "Ver Atendimento"}
                              </button>
                              <button
                                className="w-full text-left px-4 py-2 text-sm hover:bg-muted"
                                onClick={() => { setDropdownOpen(null); navigate(`/medico/prontuario/${a.id}`); }}
                              >
                                Ver Prontuário
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Próxima consulta */}
        <div className="space-y-6">
          <section className="card-elevated p-5">
            <h2 className="font-semibold mb-4">Próxima consulta</h2>
            {proximoAgendamento ? (
              <div className="text-center py-3">
                <div className="h-16 w-16 rounded-full bg-primary-soft text-primary flex items-center justify-center font-semibold text-lg mx-auto mb-3">
                  {proximoAgendamento.nome
                    ? proximoAgendamento.nome.split(" ").map((n: string) => n[0]).slice(0,2).join("")
                    : "??"}
                </div>
                <p className="font-medium">{proximoAgendamento.nome ?? "Paciente"}</p>
                <p className="text-xs text-muted-foreground mb-5">
                  {proximoAgendamento.tipo_consulta} · {proximoAgendamento.horario?.substring(0, 5) ?? ""}
                </p>
                <div className="flex gap-3">
                  <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
                    <Phone className="h-4 w-4" /> Ligar
                  </button>
                  <button
                    onClick={() => navigate(`/medico/atendimento/${proximoAgendamento.id}`)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-glow transition-colors"
                  >
                    <PlayCircle className="h-4 w-4" /> Iniciar
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">Sem próximas consultas.</div>
            )}
          </section>

          {/* Resumo rápido */}
          <section className="card-elevated p-5">
            <h2 className="font-semibold mb-4">Resumo do dia</h2>
            <div className="space-y-3">
              {agendamentos.slice(0, 4).map(a => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${
                    a.status === 'REALIZADO' ? 'bg-success' :
                    a.status === 'EM_ATENDIMENTO' ? 'bg-primary animate-pulse' :
                    a.status === 'CANCELADO' ? 'bg-destructive' : 'bg-warning'
                  }`} />
                  <p className="text-xs text-muted-foreground w-10 shrink-0">{a.horario?.substring(0,5)}</p>
                  <p className="text-sm truncate flex-1">{a.nome ?? "Paciente"}</p>
                </div>
              ))}
              {agendamentos.length > 4 && (
                <p className="text-xs text-muted-foreground text-center pt-1">+{agendamentos.length - 4} consultas</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
};

export default PainelMedico;
