import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sun, Sunrise, Sunset, Video, MapPin, Bell, CheckCircle, Clock, Activity, User, RefreshCw, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { useEntrarFilaEspera } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://anygfqhfmmkqlxegimds.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueWdmcWhmbW1rcWx4ZWdpbWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc4OTA0OCwiZXhwIjoyMDk0MzY1MDQ4fQ.32MNMF4CmR6-fPdGtbe2SW_AZ39yNKL262JD1JHy1B8";
const supabase = createClient(supabaseUrl, supabaseKey);

const VALORES: Record<string, number> = {
  "Consulta": 250,
  "Exame": 150,
  "Retorno": 0,
};

const turnos = [
  { id: "manha", label: "Manhã", icon: Sunrise, range: "07:00 — 12:00", slots: ["07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"] },
  { id: "tarde", label: "Tarde", icon: Sun, range: "12:00 — 18:00", slots: ["13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"] },
  { id: "noite", label: "Noite", icon: Sunset, range: "18:00 — 21:00", slots: ["18:00", "18:30", "19:00", "19:30", "20:00"] },
];

const SelecaoHorario = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const medicoId = searchParams.get("medico_id");
  const medicoNome = searchParams.get("medico_nome") ?? "Médico";
  const especialidade = searchParams.get("especialidade") ?? "";
  const tiposConsultaParam = searchParams.get("tipos_consulta") ?? "PRESENCIAL";
  const tiposPermitidos = tiposConsultaParam.split(",").map(t => t.trim().toUpperCase()).filter(t => ["PRESENCIAL", "TELECONSULTA"].includes(t));
  
  const [tipo, setTipo] = useState<"PRESENCIAL" | "TELECONSULTA">(
    tiposPermitidos.includes("PRESENCIAL") ? "PRESENCIAL" : "TELECONSULTA"
  );
  const [time, setTime] = useState("09:30");
  const dataAtual = new Date().toISOString().split('T')[0];
  const [dataSelecionada, setDataSelecionada] = useState(dataAtual);
  const [motivo, setMotivo] = useState("Consulta");
  const motivos = ["Consulta", "Exame", "Retorno"];
  
  const { user } = useAuth();
  const entrarFila = useEntrarFilaEspera();
  const [filaSuccess, setFilaSuccess] = useState(false);

  const [ocupados, setOcupados] = useState<string[]>([]);
  const [tempoEstimado, setTempoEstimado] = useState(15);
  const [posicaoFila, setPosicaoFila] = useState(3);
  const [statusFila, setStatusFila] = useState("Aguardando atualização...");

  useEffect(() => {
    if (filaSuccess) {
      const interval = setInterval(() => {
        setTempoEstimado(prev => (prev > 0 ? prev - 1 : 0));
      }, 60000);

      const channel = supabase
        .channel('fila_espera_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lista_espera' }, (payload) => {
          console.log("WebSocket Recebeu:", payload);
          setPosicaoFila(prev => (prev > 1 ? prev - 1 : 1));
          setTempoEstimado(prev => (prev > 5 ? prev - 5 : 5));
          setStatusFila("Sua posição foi atualizada!");
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setStatusFila("Conectado em Tempo Real");
          }
        });

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }
  }, [filaSuccess]);

  useEffect(() => {
    if (medicoId && dataSelecionada) {
      import('@/lib/api').then(({ apiFetch }) => {
        apiFetch<string[]>(`/agendamento/ocupados/${medicoId}/${dataSelecionada}`)
          .then(data => setOcupados(data || []))
          .catch(() => setOcupados([]));
      });
    }
  }, [medicoId, dataSelecionada]);

  const handleEntrarFila = () => {
    if (!medicoId) {
       toast({ title: "Médico não identificado", variant: "destructive" });
       return;
    }
    entrarFila.mutate({ medico_id: medicoId, data_alvo: dataSelecionada }, {
       onSuccess: () => {
         toast({ title: "Você entrou na fila de espera!" });
         setFilaSuccess(true);
       }
    });
  };

  const valorAtual = VALORES[motivo] ?? 250;

  const handleContinuar = () => {
    const base = new URLSearchParams(searchParams);
    base.set("slot_id", `mock-${dataSelecionada}-${time}`);
    base.set("data", dataSelecionada);
    base.set("horario", time);
    base.set("tipo_consulta", tipo);
    base.set("motivo", motivo);
    base.set("valor", String(valorAtual));
    navigate(`/paciente/confirmacao?${base.toString()}`);
  };

  return (
    <AppShell title="Seleção de Horário">
      <PageHeader
        eyebrow="Passo 2 de 4"
        title="Quando deseja ser atendido(a)?"
        description={`Disponibilidade para ${medicoNome}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <section className="space-y-6">
          <div className="card-elevated p-5">
            <p className="text-sm font-semibold mb-4">Data da Sessão</p>
            <input 
              type="date" 
              value={dataSelecionada} 
              min={dataAtual}
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="w-full p-3 rounded-lg border border-border text-sm mb-4"
            />
            
            <p className="text-sm font-semibold mb-4 border-t border-border/50 pt-4">Motivo do Agendamento</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {motivos.map(m => (
                <button
                  key={m}
                  onClick={() => setMotivo(m)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                    motivo === m ? "border-primary bg-primary-soft/60 text-primary" : "border-border hover:border-primary/40 text-muted-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <p className="text-sm font-semibold mb-4 border-t border-border/50 pt-4">Modalidade</p>
            <div className="grid grid-cols-2 gap-3">
              {tiposPermitidos.includes("PRESENCIAL") && (
                <button
                  onClick={() => setTipo("PRESENCIAL")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    tipo === "PRESENCIAL" ? "border-primary bg-primary-soft/60 ring-2 ring-primary/20" : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <MapPin className={`h-5 w-5 mb-2 ${tipo === "PRESENCIAL" ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="font-medium text-sm">Presencial</p>
                  <p className="text-xs text-muted-foreground">Na clínica</p>
                </button>
              )}
              {tiposPermitidos.includes("TELECONSULTA") && (
                <button
                  onClick={() => setTipo("TELECONSULTA")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    tipo === "TELECONSULTA" ? "border-primary bg-primary-soft/60 ring-2 ring-primary/20" : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <Video className={`h-5 w-5 mb-2 ${tipo === "TELECONSULTA" ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="font-medium text-sm">Teleconsulta</p>
                  <p className="text-xs text-muted-foreground">Por vídeo</p>
                </button>
              )}
            </div>
          </div>

          {turnos.map(t => (
            <div key={t.id} className="card-elevated p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                  <t.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.range} · {t.slots.length} horários</p>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {t.slots.map(s => {
                  const sel = time === s;
                  
                  const isToday = dataSelecionada === dataAtual;
                  const [slotH, slotM] = s.split(":").map(Number);
                  const now = new Date();
                  const isPast = isToday && (slotH < now.getHours() || (slotH === now.getHours() && slotM <= now.getMinutes()));
                  const isOcupado = ocupados.includes(s);
                  const disabled = isPast || isOcupado;

                  return (
                    <button
                      key={s}
                      disabled={disabled}
                      onClick={() => setTime(s)}
                      className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                        disabled ? "opacity-30 cursor-not-allowed bg-muted text-muted-foreground border border-transparent" :
                        sel ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border hover:border-primary/40 text-subtle-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filaSuccess ? (
            <div className="card-elevated p-6 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 relative overflow-hidden">
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
                      <h3 className="text-lg font-bold text-slate-800">Dr(a). {medicoNome}</h3>
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

                <div className="bg-amber-50 rounded-lg p-3.5 border border-amber-100 flex items-start gap-3 mb-6">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 leading-relaxed">
                    Não feche esta página. Avisaremos você automaticamente caso haja uma desistência e seu atendimento seja liberado para o dia <strong>{new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>.
                  </p>
                </div>

                <button onClick={() => navigate('/paciente/portal')} className="w-full text-sm font-semibold text-white bg-indigo-600 px-4 py-3 rounded-xl shadow-sm hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2">
                  <Activity className="h-4 w-4" /> Acompanhar pelo Painel
                </button>
              </div>
            </div>
          ) : (
            <div className="card-elevated p-5 flex items-center justify-between border-primary/20 bg-primary-soft/30">
              <div>
                <p className="font-semibold text-sm">Não encontrou o horário ideal?</p>
                <p className="text-xs text-muted-foreground mt-1">Nós avisamos você caso surja uma vaga neste dia.</p>
              </div>
              <button
                onClick={handleEntrarFila}
                disabled={entrarFila.isPending}
                className="px-4 py-2 rounded-lg bg-white border border-border text-sm font-medium hover:bg-muted transition-colors inline-flex items-center gap-2"
              >
                <Bell className="h-4 w-4 text-primary" /> 
                {entrarFila.isPending ? "Entrando..." : "Entrar na fila"}
              </button>
            </div>
          )}
        </section>

        <aside className="card-elevated p-6 h-fit lg:sticky lg:top-24">
          <h3 className="font-semibold mb-4">Resumo do agendamento</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profissional</span>
              <span className="font-medium">{medicoNome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Especialidade</span>
              <span className="font-medium">{especialidade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data</span>
              <span className="font-medium">{new Date(dataSelecionada + "T00:00:00").toLocaleDateString("pt-BR")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Horário</span>
              <span className="font-medium text-primary">{time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modalidade</span>
              <span className="font-medium">{tipo === "TELECONSULTA" ? "Teleconsulta" : "Presencial"}</span>
            </div>
            <div className="border-t border-border/50 pt-3 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-semibold text-lg">R$ 350,00</span>
            </div>
          </div>
          <button 
            onClick={handleContinuar}
            className="w-full block text-center mt-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-glow transition-colors shadow-sm"
          >
            Continuar para confirmação
          </button>
          <button 
            onClick={() => navigate(-1)}
            className="w-full block text-center mt-2 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted"
          >
            Voltar
          </button>
        </aside>
      </div>
    </AppShell>
  );
};

export default SelecaoHorario;
