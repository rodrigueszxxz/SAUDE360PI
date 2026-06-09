import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Chip } from "@/components/shared/PageHeader";
import { Download, FileText, Search, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { meuAgendamentosApi, Agendamento } from "@/lib/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function formatarData(d?: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function statusLabel(s: string) {
  const m: Record<string, { label: string; v: "success"|"destructive"|"muted"|"warning"|"info" }> = {
    CONFIRMADO: { label: "Confirmada", v: "info" },
    CONCLUIDO: { label: "Realizada", v: "success" },
    CANCELADO: { label: "Cancelada", v: "destructive" },
    NO_SHOW: { label: "Não compareceu", v: "muted" },
    PENDENTE_PAGAMENTO: { label: "Pend. pagamento", v: "warning" },
    AGUARDANDO: { label: "Aguardando", v: "info" },
    EM_ATENDIMENTO: { label: "Em atendimento", v: "info" },
  };
  return m[s] ?? { label: s, v: "muted" as const };
}

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Star } from "lucide-react";
import { useAvaliarConsulta } from "@/hooks/useApi";

const Historico = () => {
  const [busca, setBusca] = useState("");
  const [filtroAno, setFiltroAno] = useState("todos");
  const navigate = useNavigate();
  
  const [agendamentoAvaliar, setAgendamentoAvaliar] = useState<Agendamento | null>(null);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const avaliarConsulta = useAvaliarConsulta();

  const { data: agendamentos = [], isLoading, isError } = useQuery({
    queryKey: ["meus-agendamentos"],
    queryFn: meuAgendamentosApi.listar,
  });

  const anos = [...new Set(agendamentos.map(a => a.data_consulta?.slice(0, 4)).filter(Boolean))].sort().reverse();

  const filtrados = agendamentos.filter(a => {
    if (filtroAno !== "todos" && a.data_consulta?.slice(0, 4) !== filtroAno) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!a.medicos?.nome?.toLowerCase().includes(q) && !a.medicos?.especialidade?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleAvaliar = async () => {
    if (!agendamentoAvaliar) return;
    if (nota < 1 || nota > 5) return;

    try {
      await avaliarConsulta.mutateAsync({ agendamento_id: agendamentoAvaliar.id, nota, comentario });
      setAgendamentoAvaliar(null);
      setNota(0);
      setComentario("");
    } catch (e) {
      // toast is handled in useApi
    }
  };

  return (
    <AppShell title="Meus Documentos">
      <PageHeader eyebrow="Suas consultas e arquivos" title="Meus Documentos" description="Acesse receitas, atestados, exames e recibos de consultas anteriores." />

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary/60" /></div>}
      {isError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 mb-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">Erro ao carregar histórico. Verifique sua conexão.</p>
        </div>
      )}

      {!isLoading && (
        <>
          <div className="card-elevated p-4 mb-6 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por médico, especialidade..."
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-muted/50 border border-transparent focus:bg-card focus:border-primary/40 text-sm" />
            </div>
            <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)}
              className="h-11 px-4 rounded-lg bg-muted/50 text-sm">
              <option value="todos">Todos os anos</option>
              {anos.map(a => <option key={a} value={a!}>{a}</option>)}
            </select>
          </div>

          {filtrados.length === 0 ? (
            <div className="card-elevated p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhuma consulta encontrada.</p>
            </div>
          ) : (
            <div className="card-elevated overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium">Data</th>
                      <th className="text-left px-5 py-3 font-medium">Médico</th>
                      <th className="text-left px-5 py-3 font-medium">Tipo</th>
                      <th className="text-left px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filtrados.map(c => {
                      const st = statusLabel(c.status);
                      return (
                   <tr key={c.id} className="hover:bg-muted/30">
                          <td className="px-5 py-4 font-medium whitespace-nowrap">{formatarData(c.data_consulta)}</td>
                          <td className="px-5 py-4">
                            <p className="font-medium">{c.medicos?.nome ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{c.medicos?.especialidade ?? "—"}</p>
                          </td>
                          <td className="px-5 py-4 text-subtle-foreground capitalize">
                            {c.tipo_consulta === "TELECONSULTA" ? "Teleconsulta" : "Presencial"}
                          </td>
                          <td className="px-5 py-4"><Chip variant={st.v}>{st.label}</Chip></td>
                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex gap-1.5 items-center justify-end flex-wrap">
                              {c.status === "CONCLUIDO" && (
                                <button
                                  onClick={() => setAgendamentoAvaliar(c)}
                                  className="px-2.5 py-1.5 rounded bg-warning/10 text-warning text-xs font-semibold hover:bg-warning/20 transition-colors flex items-center gap-1.5"
                                >
                                  <Star className="h-3 w-3 fill-current" /> Avaliar
                                </button>
                              )}
                              <button 
                                onClick={() => navigate(`/paciente/prontuario/${c.id}#Receitas`)}
                                className="px-2.5 py-1.5 rounded bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1"
                                title="Ver Receitas"
                              >
                                <Download className="h-3 w-3" /> Receita
                              </button>
                              <button 
                                onClick={() => navigate(`/paciente/prontuario/${c.id}#Atestados`)}
                                className="px-2.5 py-1.5 rounded bg-info/10 text-info text-xs font-semibold hover:bg-info/20 transition-colors flex items-center gap-1"
                                title="Ver Atestados"
                              >
                                <Download className="h-3 w-3" /> Atestado
                              </button>
                              <button 
                                onClick={() => navigate(`/paciente/prontuario/${c.id}`)}
                                className="h-8 w-8 rounded-lg hover:bg-muted inline-flex items-center justify-center text-muted-foreground" title="Ver prontuário completo"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modal de Avaliação ──────────────────────────── */}
      <Dialog open={!!agendamentoAvaliar} onOpenChange={(open) => {
        if (!open) {
          setAgendamentoAvaliar(null);
          setNota(0);
          setComentario("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avaliar Consulta</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-sm text-muted-foreground">
            Como foi sua consulta com {agendamentoAvaliar?.medicos?.nome}?
          </DialogDescription>

          <div className="flex flex-col gap-4 mt-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  onClick={() => setNota(i)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star className={`h-8 w-8 ${nota >= i ? "text-warning fill-warning" : "text-border"}`} />
                </button>
              ))}
            </div>

            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              placeholder="Comentário opcional sobre o atendimento..."
              rows={4}
              className="w-full p-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <DialogFooter className="mt-4 gap-2">
            <DialogClose asChild>
              <button className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                Cancelar
              </button>
            </DialogClose>
            <button
              onClick={handleAvaliar}
              disabled={nota === 0 || avaliarConsulta.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {avaliarConsulta.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar Avaliação
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};
export default Historico;
