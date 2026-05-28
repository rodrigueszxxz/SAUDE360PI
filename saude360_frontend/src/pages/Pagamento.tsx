
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Chip } from "@/components/shared/PageHeader";
import { Link, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard, QrCode, FileText, Lock, ShieldCheck, Copy, Loader2,
  CheckCircle2, RefreshCw, AlertCircle, Smartphone, Video,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useCriarPix, useCriarBoleto, usePagamento, useAgendamento, useCriarCheckoutStripe } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, pagamentoApi } from "@/lib/api";

// Componente de Skeleton para carregamento
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-muted/60 ${className}`} />
);

// QR Code visual simples (CSS puro, sem biblioteca)
const QRVisual = ({ token }: { token: string }) => {
  // Gera um padrão visual determinístico baseado no token
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
          // Corners always filled (finder patterns)
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

const Pagamento = () => {
  const [metodo, setMetodo] = useState<"cartao" | "pix" | "boleto">("pix");
  const [pagamentoId, setPagamentoId] = useState<number | undefined>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const retryRef = useRef(0);

  // Card simulation state
  const [cardNum, setCardNum] = useState("");
  const [cardNome, setCardNome] = useState("");
  const [cardVal, setCardVal] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardPaying, setCardPaying] = useState(false);
  const [cardPaid, setCardPaid] = useState(false);

  // QR data após pagamento
  const [qrData, setQrData] = useState<{ qr_token: string } | null>(null);

  const { state } = useLocation();
  const convenioState = state || {};

  const agendamentoId = Number(params.get("agendamento_id")) || undefined;
  const nome = user?.nome ?? params.get("nome") ?? "";
  const cpf = user?.cpf ?? params.get("cpf") ?? "";
  const valorPreview = convenioState.valorPreview || Number(params.get("valor") ?? 60);

  const criarPix = useCriarPix();
  const criarBoleto = useCriarBoleto();
  const criarCheckout = useCriarCheckoutStripe();

  // Buscar todos os pagamentos do usuário para ver se já tem um pendente para esta consulta
  const { data: meusPagamentos } = useQuery({
    queryKey: ["meus-pagamentos"],
    queryFn: pagamentoApi.meus,
  });

  const pagamentoDaConsulta = meusPagamentos?.find(p => p.agendamento_id === agendamentoId);
  const { data: pagamentoGerado, isLoading: loadingPagamento } = usePagamento(pagamentoId);
  
  const pagamentoGlobal = pagamentoGerado ?? pagamentoDaConsulta;
  const isPagamentoPix = (p: any) => p?.codigo_pix?.startsWith("000201");
  
  const pagamentoPix = isPagamentoPix(pagamentoGlobal) ? pagamentoGlobal : null;
  const pagamentoBoleto = pagamentoGlobal && !isPagamentoPix(pagamentoGlobal) ? pagamentoGlobal : null;
  
  const pagamento = metodo === "pix" ? pagamentoPix : (metodo === "boleto" ? pagamentoBoleto : null);
  
  // Se já estiver pago, ignoramos a aba e usamos o pagamentoGlobal
  const isPago = pagamentoGlobal?.status === "PAGO" || cardPaid;

  const valorVisivel = pagamentoGlobal?.valor ?? valorPreview;

  // Busca QR token após pagamento confirmado
  useEffect(() => {
    if (isPago && agendamentoId && !qrData) {
      apiFetch<{ qr_token: string }>(`/paciente/checkin/qr/${agendamentoId}`)
        .then(data => setQrData(data))
        .catch(() => {
          // Sem QR = teleconsulta ou erro silencioso — não bloqueia o fluxo
        });
    }
  }, [pagamento?.status, agendamentoId, qrData]);

  // Idem para pagamento via cartão
  useEffect(() => {
    if (cardPaid && agendamentoId && !qrData) {
      apiFetch<{ qr_token: string }>(`/paciente/checkin/qr/${agendamentoId}`)
        .then(data => setQrData(data))
        .catch(() => {});
    }
  }, [cardPaid, agendamentoId, qrData]);

  const handleGerarPix = async (retry = 0) => {
    const nomePix = nome || user?.nome || "Paciente Teste";
    const cpfPix  = cpf  || user?.cpf  || "12345678901";
    if (!nomePix || !cpfPix) {
      toast({ title: "Dados insuficientes", description: "Faça login como paciente para gerar o PIX.", variant: "destructive" });
      return;
    }
    try {
      const payload: any = { nome: nomePix, cpf: cpfPix, valor: valorPreview, agendamento_id: agendamentoId };
      if (convenioState.convenio) {
        payload.convenio = convenioState.convenio;
        payload.carteirinha = convenioState.carteirinha;
        payload.nome_titular = convenioState.nome_titular;
        payload.validade_plano = convenioState.validade_plano;
      }
      const res = await criarPix.mutateAsync(payload);
      const id = (res as any)?.pagamento?.id ?? (res as any)?.id;
      if (!id) throw new Error("Resposta inválida do servidor");
      setPagamentoId(id);
    } catch (err: unknown) {
      // Retry automático (máx 2x)
      if (retry < 2) {
        setTimeout(() => handleGerarPix(retry + 1), 1500);
        toast({ title: `Tentando novamente (${retry + 1}/2)…` });
      } else {
        toast({ title: "Erro ao gerar PIX", description: (err instanceof Error ? err.message : "Tente novamente."), variant: "destructive" });
      }
    }
  };

  const handleGerarBoleto = async (retry = 0) => {
    const nomePix = nome || user?.nome || "Paciente Teste";
    const cpfPix  = cpf  || user?.cpf  || "12345678901";
    if (!nomePix || !cpfPix) {
      toast({ title: "Dados insuficientes", description: "Faça login como paciente para gerar o Boleto.", variant: "destructive" });
      return;
    }
    try {
      const payload: any = { nome: nomePix, cpf: cpfPix, valor: valorPreview, agendamento_id: agendamentoId };
      if (convenioState.convenio) {
        payload.convenio = convenioState.convenio;
        payload.carteirinha = convenioState.carteirinha;
        payload.nome_titular = convenioState.nome_titular;
        payload.validade_plano = convenioState.validade_plano;
      }
      const res = await criarBoleto.mutateAsync(payload);
      const id = (res as any)?.pagamento?.id ?? (res as any)?.id;
      if (!id) throw new Error("Resposta inválida do servidor");
      setPagamentoId(id);
    } catch (err: unknown) {
      if (retry < 2) {
        setTimeout(() => handleGerarBoleto(retry + 1), 1500);
        toast({ title: `Tentando novamente (${retry + 1}/2)…` });
      } else {
        toast({ title: "Erro ao gerar Boleto", description: (err instanceof Error ? err.message : "Tente novamente."), variant: "destructive" });
      }
    }
  };

  const copiar = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast({ title: "Copiado!" });
  };

  const handleSimularPagamento = async () => {
    if (!pagamento?.id) return;
    try {
      await apiFetch("/pagamentos/webhook", {
        method: "POST",
        body: JSON.stringify({ pagamento_id: pagamento.id, status: "PAGO" }),
      });
      toast({ title: "✅ Pagamento confirmado!" });
    } catch (err: unknown) {
      toast({ title: "Erro ao confirmar", description: (err instanceof Error ? err.message : "Tente novamente"), variant: "destructive" });
    }
  };

  const handlePagarCartao = async () => {
    const nomePay = nome || user?.nome || "Paciente Teste";
    const cpfPay  = cpf  || user?.cpf  || "12345678901";
    if (!nomePay || !cpfPay) {
      toast({ title: "Dados insuficientes", description: "Faça login como paciente para prosseguir.", variant: "destructive" });
      return;
    }

    try {
      setCardPaying(true);
      const payload: any = { nome: nomePay, cpf: cpfPay, valor: valorPreview, agendamento_id: agendamentoId };
      if (convenioState.convenio) {
        payload.convenio = convenioState.convenio;
        payload.carteirinha = convenioState.carteirinha;
        payload.nome_titular = convenioState.nome_titular;
        payload.validade_plano = convenioState.validade_plano;
      }
      const res = await criarPix.mutateAsync(payload);
      const id = (res as any)?.pagamento?.id ?? (res as any)?.id;
      if (!id) throw new Error("Resposta inválida do servidor");
      setPagamentoId(id);

      setTimeout(async () => {
        try {
          await apiFetch("/pagamentos/webhook", {
            method: "POST",
            body: JSON.stringify({ pagamento_id: id, status: "PAGO" }),
          });
          setCardPaying(false);
          setCardPaid(true);
        } catch {
          setCardPaying(false);
          toast({ title: "Erro na simulação", variant: "destructive" });
        }
      }, 1500);
    } catch (err: unknown) {
      toast({ title: "Erro ao iniciar simulação", description: err instanceof Error ? err.message : "Tente novamente.", variant: "destructive" });
      setCardPaying(false);
    }
  };

  // ── Card de sucesso compartilhado ────────────────────────────────────────────
  const SuccessCard = ({ tipo }: { tipo: "pix" | "cartao" | "boleto" }) => (
    <div className="flex flex-col items-center gap-5 py-6 animate-fade-in">
      {/* Ícone de sucesso */}
      <div className="relative">
        <div className="h-20 w-20 rounded-full bg-success/15 flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-success" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-success flex items-center justify-center shadow-md">
          <span className="text-white text-xs font-bold">✓</span>
        </div>
      </div>

      <div className="text-center">
        <p className="font-bold text-success text-xl">
          {tipo === "pix" ? "PIX confirmado!" : tipo === "boleto" ? "Boleto pago!" : "Pagamento aprovado!"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">Sua consulta está confirmada e agendada.</p>
      </div>

      {/* Conteúdo pós-pagamento: QR Code ou Link Telemedicina */}
      <div className="w-full max-w-[260px]">
        {convenioState.tipo_consulta === 'TELECONSULTA' ? (
          <div className="p-5 bg-card border border-border rounded-2xl shadow-sm text-center">
            <div className="flex items-center gap-2 mb-3 justify-center">
              <Video className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Teleconsulta
              </p>
            </div>
            <div className="aspect-square w-full rounded-xl bg-primary-soft flex flex-col items-center justify-center gap-3 p-4 border border-primary/20">
              <Video className="h-10 w-10 text-primary" />
              <p className="text-xs text-primary font-medium">Link de Vídeo Liberado</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              Acesse pelo portal no dia e horário da consulta.
            </p>
          </div>
        ) : (
          <div className="p-5 bg-card border border-border rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-3 justify-center">
              <Smartphone className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                QR Code para Check-in
              </p>
            </div>

            {qrData?.qr_token ? (
              <>
                <QRVisual token={qrData.qr_token} />
                <p className="text-[10px] text-center text-muted-foreground mt-3">
                  Apresente na recepção da clínica
                </p>
                <p className="text-[10px] text-center text-muted-foreground/60 mt-1">
                  Válido apenas no dia da consulta · uso único
                </p>
              </>
            ) : (
              <div className="aspect-square w-full rounded-xl bg-muted/40 flex flex-col items-center justify-center gap-2 p-4">
                <QrCode className="h-12 w-12 text-muted-foreground/40" />
                <p className="text-[10px] text-muted-foreground text-center">
                  QR Code disponível no portal do paciente
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <Link
        to="/paciente/portal"
        className="w-full max-w-[260px] py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-glow transition-colors text-center"
      >
        Ir para meu portal
      </Link>
    </div>
  );

  return (
    <AppShell title="Pagamento">
      <PageHeader
        eyebrow="Passo 4 de 4"
        title="Pagamento"
        description="Escolha como prefere pagar. Transação segura e criptografada."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <section className="space-y-6">
          {/* Seletor de método */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "pix" as const, icon: QrCode, label: "PIX", desc: "Aprovação imediata" },
              { id: "cartao" as const, icon: CreditCard, label: "Cartão", desc: "Crédito ou débito" },
              { id: "boleto" as const, icon: FileText, label: "Boleto", desc: "Vence em 3 dias" },
            ].map(m => {
              const sel = metodo === m.id;
              return (
                <button key={m.id} onClick={() => setMetodo(m.id)}
                  className={`card-elevated p-5 text-left transition-all ${sel ? "ring-2 ring-primary border-primary" : "hover:border-primary/30"}`}>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${sel ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"}`}>
                    <m.icon className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-sm">{m.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</p>
                </button>
              );
            })}
          </div>

          {/* PIX */}
          {metodo === "pix" && (
            <div className="card-elevated p-6 text-center space-y-4">
              <h3 className="font-semibold">Pague com PIX</h3>

              {!pagamento && (
                <>
                  <p className="text-sm text-muted-foreground">Clique para gerar um código PIX válido por 15 minutos.</p>
                  <button
                    onClick={() => handleGerarPix(0)}
                    disabled={criarPix.isPending}
                    className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-glow inline-flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {criarPix.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando PIX…</>
                      : <><QrCode className="h-4 w-4" /> Gerar código PIX</>}
                  </button>
                  {criarPix.isError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {(criarPix.error as Error).message}
                    </div>
                  )}
                </>
              )}

              {isPago && <SuccessCard tipo="pix" />}

              {pagamento && !isPago && (
                <>
                  {loadingPagamento ? (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-8 w-3/4 mx-auto" />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">Código PIX gerado. Copie e pague no app do banco.</p>
                      <div className="flex items-center justify-center gap-2 bg-muted/50 px-3 py-2.5 rounded-lg max-w-md mx-auto">
                        <span className="text-xs font-mono truncate flex-1 text-left">{pagamento.codigo_pix}</span>
                        <button onClick={() => copiar(pagamento.codigo_pix)} className="text-primary hover:bg-primary/10 p-1.5 rounded transition-colors">
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Botão de simulação (ambiente de testes) */}
                      <button
                        onClick={handleSimularPagamento}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-success text-white text-xs font-semibold hover:bg-success/80 transition-colors shadow-sm"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Simular pagamento aprovado (teste)
                      </button>

                      <Chip variant="info">
                        <span className="h-2 w-2 rounded-full bg-info animate-pulse inline-block mr-1" />
                        Aguardando pagamento · expira em{" "}
                        {new Date(pagamento.expira_em!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </Chip>
                      <p className="text-xs text-muted-foreground">
                        Esta página atualiza automaticamente a cada 5 segundos.
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Cartão (Stripe Simulado) */}
          {metodo === "cartao" && (
            <div className="card-elevated p-6 space-y-5 text-center">
              <h3 className="font-semibold">Pagamento Simulado com Cartão</h3>
              
              {isPago ? (
                 <SuccessCard tipo="cartao" />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Esta é uma simulação. O Stripe foi desativado conforme solicitado.</p>
                  <button
                    onClick={handlePagarCartao}
                    disabled={cardPaying || criarPix.isPending}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-glow shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    {(cardPaying || criarPix.isPending)
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando pagamento simulado…</>
                      : <><Lock className="h-4 w-4" /> Simular Pagamento R$ {valorVisivel.toFixed(2).replace(".", ",")}</>}
                  </button>
                </>
              )}
            </div>
          )}

          {metodo === "boleto" && (
            <div className="card-elevated p-6 text-center space-y-4">
              <h3 className="font-semibold">Boleto Bancário</h3>
              
              {isPago ? (
                 <SuccessCard tipo="boleto" />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Esta é uma simulação de emissão de boleto.</p>
                  
                  {pagamento ? (
                    <>
                      <div className="p-4 bg-muted/30 rounded-xl border border-border mt-2 space-y-3">
                        <div className="text-left text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Código de Barras</div>
                        <div className="bg-white p-3 border border-border/60 rounded flex items-center justify-center font-mono text-[10px] sm:text-xs text-center break-all">
                          {pagamento.codigo_pix || "34191.09008 61713.957308 71444.640008 1 930000000"}
                        </div>
                        <button onClick={() => copiar(pagamento.codigo_pix || "34191.09008 61713.957308 71444.640008 1 930000000")} className="text-primary text-xs hover:underline flex items-center gap-1 mx-auto mt-2">
                          <Copy className="h-3 w-3" /> Copiar código de barras
                        </button>
                      </div>

                      {/* Botão de simulação (ambiente de testes) */}
                      <button
                        onClick={handleSimularPagamento}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-success text-white text-xs font-semibold hover:bg-success/80 transition-colors shadow-sm w-full justify-center mt-4"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Simular pagamento do Boleto (teste)
                      </button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Normalmente, a compensação leva até 3 dias úteis.
                      </p>
                    </>
                  ) : (
                    <button
                      onClick={() => handleGerarBoleto(0)}
                      disabled={criarBoleto.isPending || cardPaying}
                      className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-glow shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-colors mt-2"
                    >
                      {(criarBoleto.isPending)
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando Boleto…</>
                        : <><FileText className="h-4 w-4" /> Gerar Boleto R$ {valorVisivel.toFixed(2).replace(".", ",")}</>}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          <div className="card-elevated p-4 flex items-start gap-3 bg-success-soft/40 border-success/30">
            <ShieldCheck className="h-5 w-5 text-success mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Pagamento 100% seguro</p>
              <p className="text-xs text-muted-foreground">Criptografia SSL · Dados não armazenados pelo frontend.</p>
            </div>
          </div>
        </section>

        {/* Sidebar de resumo */}
        <aside className="card-elevated p-6 h-fit lg:sticky lg:top-24">
          <h3 className="font-semibold mb-4">Sua reserva</h3>
          <div className="p-4 rounded-xl bg-primary-soft/40 mb-4">
            <p className="text-sm font-medium">{nome || "Paciente"}</p>
            <p className="text-xs font-semibold text-primary mt-1">{convenioState.convenio && convenioState.convenio !== "Particular" ? `Convênio: ${convenioState.convenio}` : "Consulta Particular"}</p>
            {convenioState.nome_titular && <p className="text-[11px] text-muted-foreground">Titular: {convenioState.nome_titular}</p>}
            {agendamentoId && <p className="text-[11px] text-muted-foreground mt-1">Agendamento #{agendamentoId}</p>}
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold text-primary">R$ {valorVisivel.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
          {metodo === "pix" && !pagamento && (
            <button
              onClick={() => handleGerarPix(0)}
              disabled={criarPix.isPending}
              className="w-full inline-flex items-center justify-center gap-2 mt-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-glow shadow-sm disabled:opacity-50 transition-colors"
            >
              <Lock className="h-4 w-4" /> Gerar PIX
            </button>
          )}
          {metodo === "boleto" && !pagamento && (
            <button
              onClick={() => handleGerarBoleto(0)}
              disabled={criarBoleto.isPending}
              className="w-full inline-flex items-center justify-center gap-2 mt-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-glow shadow-sm disabled:opacity-50 transition-colors"
            >
              <FileText className="h-4 w-4" /> Gerar Boleto
            </button>
          )}
          {metodo === "cartao" && !cardPaid && (
            <button
              onClick={handlePagarCartao}
              disabled={cardPaying || criarCheckout.isPending}
              className="w-full inline-flex items-center justify-center gap-2 mt-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-glow shadow-sm disabled:opacity-50 transition-colors"
            >
              <Lock className="h-4 w-4" /> Ir para checkout seguro
            </button>
          )}
          <Link to="/paciente/confirmacao" className="w-full block text-center mt-2 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            Voltar
          </Link>
        </aside>
      </div>
    </AppShell>
  );
};

export default Pagamento;
