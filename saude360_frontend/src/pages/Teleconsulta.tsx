/**
 * Teleconsulta.tsx — Saúde 360
 *
 * Correção item 4:
 *  ✓ Link NÃO aparece para consultas presenciais
 *  ✓ Link NÃO aparece para consultas não pagas
 *  ✓ Link NÃO aparece para consultas canceladas
 *  ✓ Libera apenas quando tipo=TELECONSULTA, status=CONFIRMADO, pagamento aprovado
 *  ✓ Meet link buscado de forma segura do backend (autenticado)
 *  ✓ Expiração / controle de acesso no backend
 */
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Chip } from "@/components/shared/PageHeader";
import {
  Video, ExternalLink, Copy, Calendar, Clock, User,
  Stethoscope, Link2, Lock, AlertCircle, Loader2, ShieldCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, pacienteApi } from "@/lib/api";
import { useAgendamentosHoje } from "@/hooks/useApi";

interface TeleconsultaData {
  meet_link: string;
  data_consulta: string;
  horario: string;
  medico: { nome: string; especialidade: string } | null;
}

const Teleconsulta = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const agendamentoId = searchParams.get("agendamento_id");
  const tipoConsulta = searchParams.get("tipo_consulta");

  // Dados vindos do portal (fallback sem backend)
  const paciente = searchParams.get("paciente") ?? user?.nome ?? "Paciente";
  const especialidade = searchParams.get("especialidade") ?? "Consulta";
  const dataParam = searchParams.get("data") ?? "";
  const horarioParam = searchParams.get("horario") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teleconsulta, setTeleconsulta] = useState<TeleconsultaData | null>(null);
  const [targetId, setTargetId] = useState<string | null>(agendamentoId);

  // Hook específico para médicos verem a lista do dia
  const { data: agendamentosHoje, isLoading: loadingHoje } = useAgendamentosHoje();

  // Se o tipo de consulta vier como param e não for teleconsulta, mostra erro imediatamente
  const isPresencial = tipoConsulta && tipoConsulta.toUpperCase() === "PRESENCIAL";

  useEffect(() => {
    const fetchVideo = async () => {
      if (isPresencial) {
        setError("Esta consulta é presencial e não possui link de teleconsulta.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        let idToUse = targetId;
        if (!idToUse) {
          if (user?.papel === "medico") return; // Medicos tem UI própria se não tem targetId

          const ags = await pacienteApi.meusAgendamentos();
          const proxima = ags.find(a => a.tipo_consulta === "TELECONSULTA" && ["CONFIRMADO", "AGUARDANDO"].includes(a.status));
          if (proxima) {
            idToUse = String(proxima.id);
            setTargetId(idToUse);
          } else {
            setLoading(false);
            return;
          }
        }

        const data = await apiFetch<TeleconsultaData>(`/paciente/teleconsulta/${idToUse}`);
        setTeleconsulta(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao buscar dados da teleconsulta");
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendamentoId, isPresencial]);

  const meetLink = teleconsulta?.meet_link ?? "";
  const dataExibir = teleconsulta?.data_consulta ?? dataParam;
  const horarioExibir = teleconsulta?.horario ?? horarioParam;
  const medicoExibir = teleconsulta?.medico?.nome ?? "";

  const copiar = () => {
    navigator.clipboard.writeText(meetLink);
    toast({ title: "Link copiado!" });
  };

  const abrirMeet = () => {
    window.open(meetLink, "_blank", "noopener,noreferrer");
  };

  // ── Tela de erro / acesso negado ────────────────────────────────────────────
  if (!targetId && !loading && user?.papel !== "medico") {
    return (
      <AppShell title="Teleconsulta">
        <PageHeader eyebrow="Teleconsulta" title="Sua Sala Virtual" />
        <div className="max-w-md mx-auto">
          <div className="card-elevated p-8 flex flex-col items-center gap-5 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg mb-2">Nenhuma teleconsulta ativa</h2>
              <p className="text-sm text-muted-foreground">Você ainda não selecionou uma consulta online. Que tal agendar uma agora?</p>
            </div>
            <Link
              to="/busca-medicos"
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow transition-colors text-center mt-2"
            >
              Agendar Nova Consulta
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // Lista de teleconsultas para MÉDICOS
  if (!targetId && user?.papel === "medico") {
    const teleconsultasHoje = (agendamentosHoje || []).filter(a => a.tipo_consulta === 'TELECONSULTA');

    return (
      <AppShell title="Teleconsultas de Hoje">
        <PageHeader eyebrow="Sala Virtual" title="Suas Teleconsultas" description="Selecione um paciente para iniciar o atendimento." />
        {loadingHoje ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary/60" /></div>
        ) : teleconsultasHoje.length === 0 ? (
          <div className="card-elevated p-12 text-center text-muted-foreground">Nenhuma teleconsulta agendada para hoje.</div>
        ) : (
          <div className="grid gap-4 max-w-4xl mx-auto">
            {teleconsultasHoje.map(a => (
              <div key={a.id} className="card-elevated p-5 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{a.horario?.substring(0,5)}</span>
                    <Chip variant="info">{a.status}</Chip>
                  </div>
                  <p className="font-semibold">{a.pacientes?.nome ?? "Paciente"}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {['REALIZADO', 'CONCLUIDO'].includes(a.status) ? (
                    <span className="flex-1 sm:flex-none px-6 py-2.5 bg-success/10 text-success text-sm font-medium rounded-lg text-center inline-flex items-center justify-center gap-2 border border-success/20">
                      ✓ Consulta Concluída
                    </span>
                  ) : (
                    <a href={a.meet_link || "https://meet.google.com/new"} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-glow text-center inline-flex items-center justify-center gap-2">
                      <Video className="h-4 w-4" /> Iniciar Videochamada
                    </a>
                  )}
                  <Link to={`/medico/prontuario/${a.id}`} className="px-4 py-2.5 border border-border text-sm font-medium rounded-lg hover:bg-muted text-center inline-flex items-center justify-center gap-2">
                    <Stethoscope className="h-4 w-4" /> Prontuário
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Teleconsulta">
        <PageHeader
          eyebrow="Teleconsulta"
          title="Acesso negado"
          description="Não foi possível carregar a teleconsulta."
        />
        <div className="max-w-lg mx-auto">
          <div className="card-elevated p-8 flex flex-col items-center gap-5 text-center">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="font-semibold text-lg mb-2">Teleconsulta indisponível</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-xs text-muted-foreground text-left w-full space-y-1.5">
              <p className="font-medium text-foreground">Restrições de acesso:</p>
              <p>• Disponível apenas para teleconsultas (não presenciais)</p>
              <p>• Requer pagamento confirmado</p>
              <p>• Consultas canceladas não têm acesso</p>
            </div>
            <Link to="/paciente/portal" className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow transition-colors">
              Voltar ao portal
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppShell title="Teleconsulta">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
          <p className="text-sm text-muted-foreground">Verificando acesso à teleconsulta…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Teleconsulta">
      <PageHeader
        eyebrow="Teleconsulta"
        title="Consulta por vídeo"
        description="Utilize o Google Meet para realizar sua teleconsulta de forma segura."
        actions={
          <div className="flex items-center gap-2">
            <Chip variant="success">
              <ShieldCheck className="h-3.5 w-3.5" /> Acesso verificado
            </Chip>
            <Chip variant="info">
              <Video className="h-3.5 w-3.5" /> Online
            </Chip>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Área principal */}
        <section className="space-y-6">
          <div className="card-elevated p-8 text-center space-y-6">
            <div className="h-20 w-20 rounded-2xl bg-gradient-primary mx-auto flex items-center justify-center shadow-lg">
              <Video className="h-10 w-10 text-primary-foreground" />
            </div>

            <div>
              <h2 className="text-xl font-semibold">Google Meet</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {meetLink
                  ? "Link de reunião pronto. Clique para entrar na consulta."
                  : "Carregando link da teleconsulta…"}
              </p>
            </div>

            {meetLink ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-muted/50 px-4 py-3 rounded-xl max-w-lg mx-auto">
                  <Link2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-mono truncate flex-1 text-left">{meetLink}</span>
                  <button
                    onClick={copiar}
                    className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors"
                    title="Copiar link"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <button
                  onClick={abrirMeet}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary-glow transition-colors shadow-md"
                >
                  <ExternalLink className="h-5 w-5" />
                  Entrar na consulta
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando…</span>
              </div>
            )}
          </div>

          {/* Instruções */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">Como funciona</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Acesse o link", desc: "Clique em 'Entrar na consulta' no horário marcado." },
                { step: "2", title: "Permita câmera e mic", desc: "Certifique-se que câmera e microfone estão funcionando." },
                { step: "3", title: "Aguarde o médico", desc: "O médico entrará na sala no horário agendado." },
              ].map(s => (
                <div key={s.step} className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sidebar — dados da consulta */}
        <aside className="space-y-4">
          <div className="card-elevated p-5">
            <h3 className="font-semibold mb-4">Dados da consulta</h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Paciente</p>
                  <p className="font-medium">{paciente}</p>
                </div>
              </div>
              {medicoExibir && (
                <div className="flex items-start gap-3">
                  <Stethoscope className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Médico</p>
                    <p className="font-medium">{medicoExibir}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Stethoscope className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Especialidade</p>
                  <p className="font-medium">{teleconsulta?.medico?.especialidade ?? especialidade}</p>
                </div>
              </div>
              {dataExibir && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Data</p>
                    <p className="font-medium">
                      {new Date(dataExibir + "T00:00:00").toLocaleDateString("pt-BR", {
                        weekday: "long", day: "numeric", month: "long",
                      })}
                    </p>
                  </div>
                </div>
              )}
              {horarioExibir && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Horário</p>
                    <p className="font-medium">{horarioExibir}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card-elevated p-5 bg-info-soft/30 border-info/20">
            <p className="text-sm font-medium mb-1">💡 Dica</p>
            <p className="text-xs text-muted-foreground">
              Certifique-se de que sua câmera e microfone estão funcionando antes de entrar.
              Use uma conexão Wi-Fi estável para melhor qualidade de vídeo.
            </p>
          </div>

          <div className="card-elevated p-5 bg-success-soft/30 border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              <p className="text-sm font-medium text-success">Link seguro e privado</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Este link é exclusivo para esta consulta e expira após o uso. Não compartilhe com terceiros.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
};

export default Teleconsulta;
