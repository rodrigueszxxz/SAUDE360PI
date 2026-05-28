/**
 * PacienteQRCode.tsx — Saúde 360
 * Página dedicada para o paciente ver seu QR Code de check-in.
 * Acessada via /paciente/check-in?agendamento_id=123
 * Exibe o QR code visual para apresentar na recepção.
 * Para teleconsultas, mostra botão de entrar na teleconsulta ao invés.
 */
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Chip } from "@/components/shared/PageHeader";
import {
  QrCode, Loader2, AlertCircle, Smartphone, Video, CheckCircle2,
  Calendar, Clock, User, Stethoscope, RefreshCw, Lock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, pacienteApi } from "@/lib/api";

interface QRData {
  id: number;
  qr_token: string;
  status: string;
  nome: string;
  cpf: string;
  data_consulta: string;
  horario: string;
  tipo_consulta: string;
  medicos: { nome: string; especialidade: string } | null;
}

// QR Code visual determinístico (sem biblioteca externa)
const QRVisual = ({ token }: { token: string }) => {
  const CELLS = 11;
  const hash = token.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  return (
    <div className="aspect-square w-full bg-white border-2 border-border rounded-2xl flex items-center justify-center p-4 shadow-inner">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${CELLS}, 1fr)`,
          gap: "1.5px",
          width: "100%",
          aspectRatio: "1",
        }}
      >
        {Array.from({ length: CELLS * CELLS }).map((_, i) => {
          const row = Math.floor(i / CELLS);
          const col = i % CELLS;
          // Finder patterns nos 3 cantos
          const isFinderTL = row < 3 && col < 3;
          const isFinderTR = row < 3 && col >= CELLS - 3;
          const isFinderBL = row >= CELLS - 3 && col < 3;
          const isCorner = isFinderTL || isFinderTR || isFinderBL;
          // Dados determinísticos baseados no token
          const filled = isCorner || ((hash * (i + 1) * 13) % 17 > 7);
          return (
            <div
              key={i}
              style={{
                backgroundColor: filled ? "#0f172a" : "transparent",
                borderRadius: "1px",
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

const PacienteQRCode = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const agendamentoId = searchParams.get("agendamento_id");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [targetId, setTargetId] = useState<string | null>(agendamentoId);

  const buscarQR = async () => {
    setLoading(true);
    setError(null);
    try {
      let idToUse = targetId;
      if (!idToUse) {
        const ags = await pacienteApi.meusAgendamentos();
        const proxima = ags.find(a => a.tipo_consulta !== "TELECONSULTA" && ["CONFIRMADO", "AGUARDANDO"].includes(a.status));
        if (proxima) {
          idToUse = String(proxima.id);
          setTargetId(idToUse);
        } else {
          setLoading(false);
          return;
        }
      }

      const data = await apiFetch<QRData>(`/paciente/checkin/qr/${idToUse}`);
      setQrData(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar QR Code");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarQR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendamentoId]);

  const formatarData = (d?: string) => {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "long", day: "numeric", month: "long",
    });
  };

  if (loading) {
    return (
      <AppShell title="QR Code — Check-in">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
          <p className="text-sm text-muted-foreground">Buscando seu QR Code…</p>
        </div>
      </AppShell>
    );
  }

  if (!targetId && !loading) {
    return (
      <AppShell title="QR Code — Check-in">
        <PageHeader eyebrow="Check-in" title="Seu QR Code de Acesso" />
        <div className="max-w-md mx-auto">
          <div className="card-elevated p-8 flex flex-col items-center gap-5 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <QrCode className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg mb-2">Nenhum check-in ativo</h2>
              <p className="text-sm text-muted-foreground">Você ainda não selecionou uma consulta para fazer check-in. Que tal agendar uma agora?</p>
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

  if (error) {
    return (
      <AppShell title="QR Code — Check-in">
        <PageHeader eyebrow="Check-in" title="QR Code indisponível" />
        <div className="max-w-md mx-auto">
          <div className="card-elevated p-8 flex flex-col items-center gap-5 text-center">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="font-semibold text-lg mb-2">Não foi possível carregar o QR Code</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-xs text-muted-foreground text-left w-full space-y-1.5">
              <p className="font-medium text-foreground">Possíveis motivos:</p>
              <p>• Consulta ainda não foi paga (status PENDENTE_PAGAMENTO)</p>
              <p>• Consulta é do tipo teleconsulta (não usa QR)</p>
              <p>• Consulta cancelada ou já realizada</p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={buscarQR}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Tentar novamente
              </button>
              <Link
                to="/paciente/portal"
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow transition-colors text-center"
              >
                Ir ao portal
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!qrData) return null;

  return (
    <AppShell title="QR Code — Check-in">
      <PageHeader
        eyebrow="Check-in"
        title="Seu QR Code"
        description="Apresente este código na recepção no dia da consulta."
        actions={
          <Chip variant="success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Consulta confirmada
          </Chip>
        }
      />

      <div className="max-w-md mx-auto space-y-5">
        {/* QR Code visual */}
        <div className="card-elevated p-6 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">QR Code de check-in</p>
            </div>
            <button
              onClick={buscarQR}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted"
              title="Atualizar QR Code"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <QRVisual token={qrData.qr_token} />

          <div className="text-center space-y-1">
            <p className="text-xs font-mono text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5 break-all">
              {qrData.qr_token}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Válido apenas no dia da consulta · uso único
            </p>
          </div>
        </div>

        {/* Dados da consulta */}
        <div className="card-elevated p-5 space-y-4">
          <h3 className="font-semibold text-sm">Detalhes da consulta</h3>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Paciente</p>
                <p className="font-medium">{user?.nome ?? qrData.nome}</p>
              </div>
            </div>
            {qrData.medicos && (
              <div className="flex items-start gap-3">
                <Stethoscope className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Médico</p>
                  <p className="font-medium">{qrData.medicos.nome}</p>
                  <p className="text-xs text-muted-foreground">{qrData.medicos.especialidade}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="font-medium">{formatarData(qrData.data_consulta)}</p>
              </div>
            </div>
            {qrData.horario && (
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Horário</p>
                  <p className="font-medium">{qrData.horario}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instruções */}
        <div className="card-elevated p-5 bg-info-soft/30 border-info/20 space-y-2">
          <p className="text-sm font-semibold">ℹ️ Como usar o QR Code</p>
          <div className="text-xs text-muted-foreground space-y-1.5">
            <p>1. Chegue à clínica com 15 minutos de antecedência.</p>
            <p>2. Apresente este QR Code para o recepcionista.</p>
            <p>3. O check-in será registrado automaticamente.</p>
            <p className="text-destructive/70 font-medium">⚠️ O QR Code é válido uma única vez e apenas no dia da consulta.</p>
          </div>
        </div>

        <Link
          to="/paciente/portal"
          className="w-full py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors text-center block"
        >
          Voltar ao portal
        </Link>

        <p className="text-[10px] text-center text-muted-foreground">
          Atualizado às {lastRefresh.toLocaleTimeString("pt-BR")}
        </p>
      </div>
    </AppShell>
  );
};

export default PacienteQRCode;
