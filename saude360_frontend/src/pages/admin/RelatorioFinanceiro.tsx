import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DollarSign, RefreshCcw, Activity, ArrowDownCircle, AlertCircle, Loader2 } from "lucide-react";

interface Relatorio {
  total_faturado: number;
  total_pendente: number;
  total_reembolsado: number;
  total_credito_retido: number;
  quantidade_vendas: number;
}

const formatarMoeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const RelatorioFinanceiro = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-financeiro-relatorio'],
    queryFn: () => api.get<Relatorio>('/pagamentos/admin/relatorio'),
  });

  return (
    <AppShell title="Financeiro e Estornos" subtitle="Gestão Financeira">
      <PageHeader
        eyebrow="Painel Administrativo"
        title="Relatórios e Estornos"
        description="Acompanhe o faturamento, pagamentos pendentes e reembolsos."
      />

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 mb-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">Erro ao carregar dados financeiros.</p>
        </div>
      )}

      {!isLoading && !isError && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card-elevated p-5 border-l-4 border-l-success">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">Faturamento Líquido</p>
              <div className="h-8 w-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatarMoeda(data.total_faturado)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.quantidade_vendas} pagamentos confirmados</p>
          </div>

          <div className="card-elevated p-5 border-l-4 border-l-warning">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">Aguardando Pagamento</p>
              <div className="h-8 w-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatarMoeda(data.total_pendente)}</p>
            <p className="text-xs text-muted-foreground mt-1">PIX ou Boletos em aberto</p>
          </div>

          <div className="card-elevated p-5 border-l-4 border-l-destructive">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">Estornos (Reembolsado)</p>
              <div className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                <RefreshCcw className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatarMoeda(data.total_reembolsado)}</p>
            <p className="text-xs text-muted-foreground mt-1">Devoluções automáticas</p>
          </div>

          <div className="card-elevated p-5 border-l-4 border-l-info">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">Crédito Retido</p>
              <div className="h-8 w-8 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <ArrowDownCircle className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatarMoeda(data.total_credito_retido)}</p>
            <p className="text-xs text-muted-foreground mt-1">Cancelamentos &lt; 12h</p>
          </div>
        </div>
      )}

      {/* Lista de Estornos placeholder para US-63 */}
      <section className="card-elevated">
        <div className="flex items-center justify-between p-5 border-b border-border/60">
          <h3 className="font-semibold">Histórico de Estornos e Créditos</h3>
        </div>
        <div className="p-8 text-center text-muted-foreground text-sm">
          A lista detalhada de estornos será carregada aqui (implementação pendente do grid de reembolsos).
        </div>
      </section>
    </AppShell>
  );
};

export default RelatorioFinanceiro;
