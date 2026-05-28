import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Chip } from "@/components/shared/PageHeader";
import { Download, Receipt as ReceiptIcon, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { pagamentoApi, Pagamento } from "@/lib/api";

function formatarData(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const Recibos = () => {
  const { user } = useAuth();

  const baixarRecibo = async (p: Pagamento) => {
    try {
      const blob = await pagamentoApi.baixarRecibo(p.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; 
      a.download = `recibo-saude360-${p.id}.pdf`; 
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao baixar recibo", err);
    }
  };
  const { data: pagamentos = [], isLoading, isError } = useQuery({
    queryKey: ["meus-pagamentos"],
    queryFn: pagamentoApi.meus,
  });

  const pagos = pagamentos.filter(p => p.status === "PAGO");
  const totalPago = pagos.reduce((s, p) => s + (p.valor ?? 0), 0);

  return (
    <AppShell title="Recibos & Comprovantes">
      <PageHeader eyebrow="Comprovantes" title="Recibos e comprovantes"
        description="Baixe seus comprovantes para reembolso ou imposto de renda." />

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary/60" /></div>}
      {isError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 mb-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">Erro ao carregar recibos. Verifique sua conexão.</p>
        </div>
      )}

      {!isLoading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="card-elevated p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total pago</p>
              <p className="text-2xl font-semibold mt-2">R$ {totalPago.toFixed(2).replace(".", ",")}</p>
              <p className="text-xs text-success mt-1">{pagos.length} comprovante(s) emitido(s)</p>
            </div>
            <div className="card-elevated p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pagamentos pendentes</p>
              <p className="text-2xl font-semibold mt-2 text-warning">
                {pagamentos.filter(p => p.status === "PENDENTE").length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">aguardando confirmação</p>
            </div>
          </div>

          {pagamentos.length === 0 ? (
            <div className="card-elevated p-12 text-center text-muted-foreground">
              <ReceiptIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum comprovante disponível ainda.</p>
            </div>
          ) : (
            <div className="card-elevated overflow-hidden">
              <ul className="divide-y divide-border/50">
                {pagamentos.map(p => (
                  <li key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="h-11 w-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                      <ReceiptIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Pagamento #{p.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.expira_em ? formatarData(p.expira_em) : "—"} · R$ {p.valor?.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    <Chip variant={p.status === "PAGO" ? "success" : p.status === "PENDENTE" ? "warning" : "muted"}>
                      {p.status === "PAGO" ? "Pago" : p.status === "PENDENTE" ? "Pendente" : p.status}
                    </Chip>
                    {p.status === "PAGO" && (
                      <button onClick={() => baixarRecibo(p)} className="h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground" title="Baixar comprovante">
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
};
export default Recibos;
