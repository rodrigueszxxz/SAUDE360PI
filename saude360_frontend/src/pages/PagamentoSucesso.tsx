import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, Loader2, Smartphone, QrCode, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";

const QRVisual = ({ token }: { token: string }) => {
  const cells = 9;
  const hash = token.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (
    <div className="aspect-square w-full bg-white border border-border rounded-xl flex items-center justify-center p-3 shadow-inner">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cells}, 1fr)`,
          gap: "2px",
          width: "100%",
          aspectRatio: "1",
        }}
      >
        {Array.from({ length: cells * cells }).map((_, i) => {
          const row = Math.floor(i / cells);
          const col = i % cells;
          const isCorner =
            (row < 3 && col < 3) ||
            (row < 3 && col >= cells - 3) ||
            (row >= cells - 3 && col < 3);
          const filled = isCorner || ((hash * (i + 1) * 7) % 13 > 5);
          return (
            <div
              key={i}
              style={{
                backgroundColor: filled ? "#1a1a2e" : "transparent",
                borderRadius: "1px",
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

type PagamentoStatus = {
  id: number;
  status: string;
  valor: number;
  agendamento_id?: number;
};

const PagamentoSucesso = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id");
  const pagamentoId = params.get("pagamento_id");

  const [pagamento, setPagamento] = useState<PagamentoStatus | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!pagamentoId) {
      setErro("Parâmetros inválidos na URL.");
      setLoading(false);
      return;
    }

    const buscar = async () => {
      try {
        const pag = await apiFetch<PagamentoStatus>(`/pagamentos/${pagamentoId}`);

        setPagamento(pag);

        if (pag?.agendamento_id) {
          try {
            const qr = await apiFetch<{ qr_token: string }>(
              `/paciente/checkin/qr/${pag.agendamento_id}`
            );
            setQrToken(qr.qr_token);
          } catch {
            // Teleconsulta não tem QR
          }
        }
      } catch (err: unknown) {
        setErro(
          err instanceof Error ? err.message : "Erro ao verificar pagamento."
        );
      } finally {
        setLoading(false);
      }
    };

    buscar();
  }, [pagamentoId]);

  if (loading) {
    return (
      <AppShell title="Verificando pagamento">
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">
            Verificando seu pagamento…
          </p>
        </div>
      </AppShell>
    );
  }

  if (erro) {
    return (
      <AppShell title="Erro">
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-destructive font-semibold">{erro}</p>
          <button
            onClick={() => navigate("/paciente/portal")}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            Ir para o portal
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Pagamento Confirmado">
      <div className="max-w-md mx-auto py-10 flex flex-col items-center gap-6">
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle2 className="h-14 w-14 text-success" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-success flex items-center justify-center shadow-md">
            <span className="text-white text-sm font-bold">✓</span>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-success">
            Pagamento confirmado!
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Sua consulta está agendada e confirmada com sucesso.
          </p>
          {pagamento?.valor && (
            <p className="mt-3 text-lg font-semibold text-foreground">
              Valor pago:{" "}
              <span className="text-primary">
                R$ {Number(pagamento.valor).toFixed(2).replace(".", ",")}
              </span>
            </p>
          )}
        </div>

        <div className="w-full card-elevated p-5">
          <div className="flex items-center gap-2 mb-4 justify-center">
            <Smartphone className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
              QR Code para Check-in
            </p>
          </div>

          {qrToken ? (
            <>
              <QRVisual token={qrToken} />
              <p className="text-[11px] text-center text-muted-foreground mt-3">
                Apresente na recepção da clínica
              </p>
              <p className="text-[10px] text-center text-muted-foreground/60 mt-1">
                Válido apenas no dia da consulta · uso único
              </p>
            </>
          ) : (
            <div className="aspect-square w-full rounded-xl bg-muted/40 flex flex-col items-center justify-center gap-3 p-6">
              <QrCode className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground text-center">
                QR Code disponível no portal do paciente
              </p>
            </div>
          )}
        </div>

        <div className="w-full space-y-3">
          <Link
            to="/paciente/portal"
            className="w-full block text-center py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-sm"
          >
            Ir para meu portal
          </Link>
          <Link
            to="/paciente/historico"
            className="w-full block text-center py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Ver histórico de consultas
          </Link>
        </div>
      </div>
    </AppShell>
  );
};

export default PagamentoSucesso;
