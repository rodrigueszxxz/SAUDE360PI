import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, StatCard, Chip } from "@/components/shared/PageHeader";
import { UserCheck, Clock, AlertCircle, Phone, ArrowRight, UserPlus, Search, Loader2 } from "lucide-react";
import { useAgendamentosHoje } from "@/hooks/useApi";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const PainelRecepcao = () => {
  const { data: agendamentos = [], isLoading } = useAgendamentosHoje();
  const navigate = useNavigate();

  // Filtrar apenas agendamentos de hoje relevantes para a fila (confirmados/aguardando)
  const fila = useMemo(() => {
    return agendamentos
      .filter(a => ["CONFIRMADO", "PENDENTE_PAGAMENTO", "REALIZADO"].includes(a.status))
      .sort((a, b) => (a.horario || "").localeCompare(b.horario || ""));
  }, [agendamentos]);

  const naFila = fila.filter(a => a.status === "CONFIRMADO").length;

  return (
    <AppShell title="Painel da Recepção" subtitle="Atendimento em tempo real">
      <PageHeader
        eyebrow="Operacional"
        title="Recepção"
        description="Controle a fila, faça check-in e mantenha pacientes informados."
        actions={
          <>
            <button onClick={() => navigate("/busca")} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"><Search className="h-4 w-4" /> Nova consulta</button>
            <button onClick={() => navigate("/checkin")} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow transition-colors shadow-sm"><UserPlus className="h-4 w-4" /> Novo check-in</button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pacientes na fila" value={naFila.toString()} icon={<UserCheck className="h-5 w-5" />} accent="primary" trend="Aguardando" trendDirection="up" />
        <StatCard label="Total agendamentos" value={agendamentos.length.toString()} icon={<Clock className="h-5 w-5" />} accent="info" trend="Hoje" trendDirection="neutral" />
        <StatCard label="Cancelados" value={agendamentos.filter(a => a.status === 'CANCELADO').length.toString()} icon={<AlertCircle className="h-5 w-5" />} accent="warning" />
        <StatCard label="Teleconsultas" value={agendamentos.filter(a => a.tipo_consulta === 'TELECONSULTA').length.toString()} icon={<Phone className="h-5 w-5" />} accent="primary" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <section className="card-elevated overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border/60">
            <div>
              <h3 className="font-semibold">Fila de atendimento</h3>
              <p className="text-xs text-muted-foreground">Ordenado por horário</p>
            </div>
            <Chip variant="primary">{fila.length} agendamentos</Chip>
          </div>
          <div className="overflow-x-auto min-h-[300px]">
            {isLoading ? (
              <div className="flex justify-center items-center h-full py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : fila.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Nenhum paciente na fila hoje.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Horário</th>
                    <th className="text-left px-5 py-3 font-medium">Paciente</th>
                    <th className="text-left px-5 py-3 font-medium">Médico</th>
                    <th className="text-left px-5 py-3 font-medium">Tipo</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {fila.map(a => (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-primary">{a.horario ? a.horario.substring(0, 5) : "—"}</td>
                      <td className="px-5 py-3 font-medium">{a.pacientes?.nome ?? "Sem nome"}</td>
                      <td className="px-5 py-3 text-subtle-foreground">{a.medicos?.nome ?? "Médico"}</td>
                      <td className="px-5 py-3 text-subtle-foreground">{a.tipo_consulta === 'TELECONSULTA' ? 'Online' : 'Presencial'}</td>
                      <td className="px-5 py-3">
                        <Chip variant={a.status === 'CONFIRMADO' ? 'success' : a.status === 'REALIZADO' ? 'info' : 'warning'}>
                          {a.status === 'CONFIRMADO' ? 'Aguardando' : a.status}
                        </Chip>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => alert('Paciente chamado no painel (Simulação)')} className="text-primary hover:underline text-xs font-medium inline-flex items-center gap-1">Chamar <ArrowRight className="h-3 w-3" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export default PainelRecepcao;
