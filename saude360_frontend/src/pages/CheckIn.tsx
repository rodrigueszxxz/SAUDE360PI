import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, StatCard, Chip } from "@/components/shared/PageHeader";
import { CheckCircle2, Clock, Users, AlertCircle, ArrowRight, QrCode, Loader2 } from "lucide-react";
import { useAgendamentosHoje, useValidarQR, useAtualizarStatus } from "@/hooks/useApi";
import type { Agendamento } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  PENDENTE_PAGAMENTO: "Pendente",
  CONFIRMADO: "Confirmado",
  AGUARDANDO: "Check-in feito",
  EM_ATENDIMENTO: "Em consulta",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
  NO_SHOW: "Faltou",
};

const STATUS_CHIP: Record<string, "primary" | "info" | "warning" | "success" | "destructive" | "muted"> = {
  PENDENTE_PAGAMENTO: "warning",
  CONFIRMADO: "primary",
  AGUARDANDO: "info",
  EM_ATENDIMENTO: "info",
  FINALIZADO: "success",
  CANCELADO: "destructive",
  NO_SHOW: "destructive",
};

const CheckIn = () => {
  const [qrInput, setQrInput] = useState("");
  const { data: agendamentos = [], isLoading, refetch } = useAgendamentosHoje();
  const validarQR = useValidarQR();
  const atualizarStatus = useAtualizarStatus();

  const ags = agendamentos as Agendamento[];
  const checkins = ags.filter(a => a.status === "AGUARDANDO").length;
  const emAtendimento = ags.filter(a => a.status === "EM_ATENDIMENTO").length;
  const acimaDoSLA = ags.filter(a =>
    ["CONFIRMADO", "AGUARDANDO"].includes(a.status)
  ).length;

  const handleQR = async () => {
    if (!qrInput.trim()) return;
    await validarQR.mutateAsync(qrInput.trim());
    setQrInput("");
    refetch();
  };

  return (
    <AppShell title="Check-in & Status">
      <PageHeader
        eyebrow="Tempo real"
        title="Status de atendimento"
        description="Acompanhe a progressão de cada paciente em tempo real."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Check-ins hoje" value={String(checkins)} icon={<CheckCircle2 className="h-5 w-5" />} accent="success" />
        <StatCard label="Em atendimento" value={String(emAtendimento)} icon={<Users className="h-5 w-5" />} accent="info" />
        <StatCard label="Total hoje" value={String(ags.length)} icon={<Clock className="h-5 w-5" />} accent="primary" />
        <StatCard label="Aguardando" value={String(acimaDoSLA)} icon={<AlertCircle className="h-5 w-5" />} accent="warning" />
      </div>

      {/* QR Check-in manual */}
      <section className="card-elevated p-6 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><QrCode className="h-5 w-5" /> Check-in por QR Code</h3>
        <div className="flex gap-3">
          <input
            value={qrInput}
            onChange={e => setQrInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleQR()}
            placeholder="Cole ou escaneie o token QR aqui..."
            className="flex-1 h-11 px-3.5 rounded-lg border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={handleQR}
            disabled={validarQR.isPending || !qrInput.trim()}
            className="px-5 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow disabled:opacity-50 inline-flex items-center gap-2"
          >
            {validarQR.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validar"}
          </button>
        </div>
        {validarQR.isError && (
          <p className="text-xs text-destructive mt-2">{(validarQR.error as Error).message}</p>
        )}
      </section>

      {/* Fila de pacientes */}
      <section className="card-elevated overflow-hidden">
        <div className="p-5 border-b border-border/60 flex items-center justify-between">
          <h3 className="font-semibold">Pacientes de hoje</h3>
          <button onClick={() => refetch()} className="text-xs text-primary font-medium hover:underline">Atualizar</button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : ags.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground">Nenhum agendamento para hoje.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {ags.map(a => (
              <li key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="font-mono text-xs font-semibold text-primary w-16">#{a.protocolo?.slice(-6) ?? a.id}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.nome}</p>
                  <p className="text-xs text-muted-foreground">{a.horario} · CPF {a.cpf.slice(0,3)}***</p>
                </div>
                <Chip variant={STATUS_CHIP[a.status] ?? "muted"}>{STATUS_LABEL[a.status] ?? a.status}</Chip>
                {a.status === "CONFIRMADO" && (
                  <button
                    onClick={() => atualizarStatus.mutate({ id: a.id, status: "AGUARDANDO", alterado_por: "recepcao" })}
                    className="text-primary hover:underline text-xs font-medium inline-flex items-center gap-1"
                  >
                    Check-in <ArrowRight className="h-3 w-3" />
                  </button>
                )}
                {a.status === "AGUARDANDO" && (
                  <button
                    onClick={() => atualizarStatus.mutate({ id: a.id, status: "EM_ATENDIMENTO", alterado_por: "recepcao" })}
                    className="text-info hover:underline text-xs font-medium inline-flex items-center gap-1"
                  >
                    Atender <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
};

export default CheckIn;
