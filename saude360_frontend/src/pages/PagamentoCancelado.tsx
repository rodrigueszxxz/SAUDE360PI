import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { XCircle, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

const PagamentoCancelado = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const agendamentoId = params.get("agendamento_id");

  return (
    <AppShell title="Pagamento Cancelado">
      <div className="max-w-md mx-auto py-10 flex flex-col items-center gap-6">
        <div className="h-24 w-24 rounded-full bg-destructive/15 flex items-center justify-center">
          <XCircle className="h-14 w-14 text-destructive" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Pagamento não realizado
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Você cancelou o processo de pagamento ou ele foi interrompido.
            Seu agendamento ainda está pendente.
          </p>
        </div>

        <div className="w-full card-elevated p-5 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">O que acontece agora?</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Seu agendamento foi preservado</li>
            <li>Você pode tentar o pagamento novamente</li>
            <li>O horário fica reservado por tempo limitado</li>
          </ul>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={() =>
              navigate(
                agendamentoId
                  ? `/paciente/pagamento?agendamento_id=${agendamentoId}`
                  : "/paciente/pagamento"
              )
            }
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
          <Link
            to="/paciente/portal"
            className="w-full block text-center py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Voltar ao portal
          </Link>
        </div>
      </div>
    </AppShell>
  );
};

export default PagamentoCancelado;
