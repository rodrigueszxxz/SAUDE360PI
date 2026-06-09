import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, StatCard, Chip } from "@/components/shared/PageHeader";
import { Users, DollarSign, Calendar, Activity, AlertCircle, Loader2, Clock, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";

const KPIs = () => {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['admin-kpis'],
    queryFn: () => adminApi.kpis() as Promise<any>,
    refetchInterval: 30000, // Atualiza a cada 30 segundos automaticamente
  });

  const faturamentoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis?.faturamentoMes || 0);

  return (
    <AppShell title="Dashboard Admin">
      <PageHeader eyebrow="Visão executiva" title="Indicadores de Performance" description="Métricas financeiras e operacionais em tempo real" />
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Faturamento do Mês" value={faturamentoFormatado} trend="Tempo real" trendDirection="up" icon={<DollarSign className="h-5 w-5"/>} accent="success" />
            <StatCard label="Consultas Mês" value={(kpis?.consultasMes || 0).toString()} trend={`${kpis?.consultasHoje || 0} hoje`} trendDirection="neutral" icon={<Calendar className="h-5 w-5"/>} accent="primary" />
            <StatCard label="Cancelamentos" value={(kpis?.cancelamentos || 0).toString()} trend="No mês" trendDirection={kpis?.cancelamentos > 10 ? "down" : "neutral"} icon={<AlertCircle className="h-5 w-5"/>} accent="warning" />
            <StatCard label="Taxa de No-Show" value={`${kpis?.taxaNoShow || 0}%`} trend="Geral do mês" trendDirection="neutral" icon={<Activity className="h-5 w-5"/>} accent="info" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="card-elevated p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Sala de Espera Hoje</h3>
                <Chip variant="primary">Agora</Chip>
              </div>
              
              <div className="space-y-4">
                {[
                  { l: "Pacientes Aguardando", v: kpis?.aguardando?.toString() || "0", ok: (kpis?.aguardando || 0) < 10 },
                  { l: "Em Atendimento", v: kpis?.emAtendimento?.toString() || "0", ok: true },
                ].map(i => (
                  <div key={i.l} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{i.l}</p>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <p className="font-semibold">{i.v}</p>
                      <Chip variant={i.ok ? "success" : "warning"}>{i.ok ? "Normal" : "Lotado"}</Chip>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-elevated p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Engajamento</h3>
                <Chip variant="neutral">Ativos</Chip>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <p className="text-sm font-medium">Pacientes Cadastrados</p>
                  <p className="font-semibold">{kpis?.totalPacientes || 0}</p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <p className="text-sm font-medium">Corpo Clínico (Médicos Ativos)</p>
                  <p className="font-semibold">{kpis?.medicoAtivos || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Seção de Auditoria LGPD */}
      <section className="card-elevated p-5 mt-6">
        <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-3">
          <h3 className="font-semibold flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" /> Logs de Auditoria (LGPD)</h3>
          <Chip variant="success">Rastreabilidade Ativa</Chip>
        </div>
        <AuditTable />
      </section>
    </AppShell>
  );
};

const AuditTable = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-auditoria'],
    queryFn: () => adminApi.auditoria({ limit: '10' }),
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="text-center text-muted-foreground text-sm p-4">Carregando logs...</div>;
  if (!logs?.dados || logs.dados.length === 0) return <div className="text-center text-muted-foreground text-sm p-4">Nenhum registro recente encontrado.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground bg-muted/40 uppercase">
          <tr>
            <th className="px-4 py-3 rounded-tl-lg">Data/Hora</th>
            <th className="px-4 py-3">Usuário</th>
            <th className="px-4 py-3">Ação</th>
            <th className="px-4 py-3">Entidade</th>
            <th className="px-4 py-3 rounded-tr-lg">IP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {logs.dados.map((log: any) => (
            <tr key={log.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap">
                {new Date(log.criado_em).toLocaleString('pt-BR')}
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-foreground">{log.usuario_email || log.usuario_id}</span>
                <span className="block text-[10px] text-muted-foreground uppercase">{log.papel || 'admin'}</span>
              </td>
              <td className="px-4 py-3">
                <Chip variant={log.acao.includes('ERRO') || log.acao.includes('DELETE') ? 'destructive' : log.acao.includes('EDITAR') ? 'warning' : 'info'}>
                  {log.acao}
                </Chip>
              </td>
              <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.entidade}</td>
              <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.ip || 'Local'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default KPIs;
