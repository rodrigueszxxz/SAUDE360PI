/**
 * AtendimentoMedico.tsx — Saúde 360
 * Tela de atendimento ao vivo do médico.
 * v3 — ICP-Brasil, atestado com download HTML, tabs completas.
 */
import { AppShell } from "@/components/layout/AppShell";
import { Chip } from "@/components/shared/PageHeader";
import {
  AlertTriangle, CheckCircle2, ChevronRight, ClipboardList,
  Download, FileText, Heart, Loader2, Pen, Pill, Plus,
  Stethoscope, Trash2, Activity, Eye, EyeOff, ShieldCheck,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { prontuarioApi, agendamentoApi } from "@/lib/api";
import { useAgendamento } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";

/* ── Tabs ─────────────────────────────────────────────────────────── */
const TABS = ["Queixas & Histórico", "Prontuário", "Receitas", "Exames", "Atestados", "Evolução"] as const;
type Tab = typeof TABS[number];

/* ── Tipos ────────────────────────────────────────────────────────── */
interface Medicamento { nome: string; posologia: string; quantidade: string; }
const medVazio = (): Medicamento => ({ nome: "", posologia: "", quantidade: "1" });

/* ── Modal genérico ───────────────────────────────────────────────── */
function Modal({ title, onClose, children, footer, wide = false }: {
  title: string; onClose: () => void;
  children: React.ReactNode; footer: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`bg-card w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl shadow-2xl overflow-hidden border border-border/60 max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20 shrink-0">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">✕</button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        <div className="px-5 py-4 border-t border-border/60 bg-muted/20 flex justify-end gap-2 shrink-0">{footer}</div>
      </div>
    </div>
  );
}

/* ── ICP-Brasil Signature Simulation ─────────────────────────────── */
function ICPBrasilSignature({ onSign }: { onSign: (token: string) => void }) {
  const [cert, setCert] = useState("");
  const [pin, setPin] = useState("");
  const [signing, setSigning] = useState(false);

  const handleSign = () => {
    if (!cert || !pin) return;
    setSigning(true);
    setTimeout(() => {
      setSigning(false);
      onSign(`ICP-BR-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now()}`);
    }, 1500);
  };

  return (
    <div className="space-y-4 text-left">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Certificado Digital</label>
        <select
          value={cert}
          onChange={(e) => setCert(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        >
          <option value="">Selecione um certificado...</option>
          <option value="A3">Dr(a). Médico — e-CPF A3 (Token USB)</option>
          <option value="A1">Dr(a). Médico — e-CPF A1 (Arquivo)</option>
          <option value="Nuvem">Dr(a). Médico — Certificado em Nuvem</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">PIN (Senha do Certificado)</label>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Digite a senha do certificado"
          className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
      </div>
      <button
        type="button"
        onClick={handleSign}
        disabled={!cert || !pin || signing}
        className="w-full py-2.5 bg-muted text-foreground border border-border rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
      >
        {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {signing ? "Validando certificado..." : "Validar e Assinar Digitalmente"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
const AtendimentoMedico = () => {
  const { agendamento_id } = useParams<{ agendamento_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("Queixas & Histórico");
  const [form, setForm] = useState({
    queixa: "", diagnostico: "", conduta: "", cid: "",
    necessita_retorno: false, prazo_retorno: "",
  });
  const [autoSaveLabel, setAutoSaveLabel] = useState<"salvo" | "salvando" | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modais
  const [modalReceita, setModalReceita] = useState(false);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([medVazio()]);
  const [modalEvolucao, setModalEvolucao] = useState(false);
  const [textoEvolucao, setTextoEvolucao] = useState("");
  const [modalExame, setModalExame] = useState(false);
  const [listaExames, setListaExames] = useState("");
  const [urgenciaExame, setUrgenciaExame] = useState("ROTINA");
  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [assinaturaToken, setAssinaturaToken] = useState<string | null>(null);
  const [showObsPrivadas, setShowObsPrivadas] = useState(false);

  // Modal Atestado
  const [modalAtestado, setModalAtestado] = useState(false);
  const [atestadoForm, setAtestadoForm] = useState({
    tipo: "AFASTAMENTO",
    dias_afastamento: "",
    cid: "",
    descricao: "",
  });
  const [atestadoToken, setAtestadoToken] = useState<string | null>(null);

  /* ── Dados ── */
  const { data: agendamento, isLoading: loadingAg } = useAgendamento(Number(agendamento_id));

  const { data: prontuario, isLoading: loadingPront } = useQuery({
    queryKey: ["prontuario", agendamento_id],
    queryFn: () => prontuarioApi.buscarPorAgendamento(Number(agendamento_id)),
    enabled: !!agendamento_id,
    retry: false,
  });

  useEffect(() => {
    if (prontuario) {
      // prazo_retorno vem como inteiro (dias) do banco → converter para data
      let prazoStr = "";
      if (prontuario.prazo_retorno) {
        const d = new Date();
        d.setDate(d.getDate() + Number(prontuario.prazo_retorno));
        prazoStr = d.toISOString().split("T")[0];
      }
      setForm(prev => ({
        ...prev,
        queixa:              prontuario.queixa || "",
        diagnostico:         prontuario.diagnostico || "",
        conduta:             prontuario.conduta || "",
        cid:                 prontuario.cid || "",
        necessita_retorno:   prontuario.necessita_retorno || false,
        prazo_retorno:       prazoStr,
      }));
    }
  }, [prontuario]);

  /* ── Helpers ── */
  const getPacienteCpf = () => (agendamento as any)?.cpf ?? "";

  /** Garante que o prontuário existe e retorna o ID */
  const garantirProntuario = useCallback(async (dadosExtra: any = {}) => {
    const payload = {
      ...form,
      ...dadosExtra,
      agendamento_id: Number(agendamento_id),
      paciente_cpf: getPacienteCpf(),
    };

    let result: any;
    if (prontuario?.id) {
      result = await prontuarioApi.salvar({ ...payload, id: prontuario.id });
    } else {
      result = await prontuarioApi.salvar(payload);
    }
    queryClient.invalidateQueries({ queryKey: ["prontuario", agendamento_id] });
    return result?.id ?? prontuario?.id;
  }, [form, prontuario, agendamento_id, agendamento]);

  /* ── Mutation: salvar prontuário ── */
  const salvarMutation = useMutation({
    mutationFn: (dados: any) => prontuarioApi.salvar({
      ...dados,
      id: prontuario?.id,
      agendamento_id: Number(agendamento_id),
      paciente_cpf: getPacienteCpf(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prontuario", agendamento_id] });
      setAutoSaveLabel("salvo");
      setTimeout(() => setAutoSaveLabel(null), 3000);
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar prontuário", description: err.message, variant: "destructive" });
    },
  });

  /* ── Auto-save ── */
  const handleFormChange = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setAutoSaveLabel("salvando");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      salvarMutation.mutate({ ...form, [field]: value });
    }, 5000);
  };

  /* ── Download Atestado ── */
  const downloadAtestado = (atestado: any) => {
    const ag = agendamento as any;
    const medico = ag?.medicos || {};
    const tipoLabel: Record<string, string> = {
      AFASTAMENTO:    "Atestado de Afastamento",
      COMPARECIMENTO: "Atestado de Comparecimento",
      ACOMPANHAMENTO: "Atestado de Acompanhamento",
      APTIDAO:        "Atestado de Aptidão Física",
    };
    const label = tipoLabel[atestado.tipo] || "Atestado Médico";
    const dataHoje = new Date().toLocaleDateString("pt-BR");
    const horaAgora = new Date().toLocaleString("pt-BR");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${label} — Saúde 360</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; max-width: 800px; margin: 40px auto; padding: 40px; color: #1a1a1a; background: #fff; }
    .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 24px; margin-bottom: 32px; }
    .logo { font-size: 26px; font-weight: bold; color: #2563eb; letter-spacing: -0.5px; }
    .logo span { color: #0ea5e9; }
    .subtitulo { font-size: 12px; color: #64748b; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; }
    h1 { font-size: 22px; font-weight: bold; margin-bottom: 28px; color: #0f172a; text-align: center; }
    .campo { margin: 16px 0; padding: 14px 16px; border-left: 3px solid #2563eb; background: #f8fafc; border-radius: 0 8px 8px 0; }
    .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: bold; margin-bottom: 4px; }
    .valor { font-size: 16px; color: #0f172a; font-weight: 500; }
    .destaque { background: #fff7ed; border-left-color: #f97316; }
    .assinatura { margin-top: 60px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 24px; }
    .assinatura p { font-size: 15px; font-weight: bold; color: #0f172a; }
    .assinatura small { font-size: 12px; color: #64748b; display: block; margin-top: 4px; }
    .icp-box { margin-top: 24px; background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 1.5px solid #2563eb; border-radius: 12px; padding: 18px; }
    .icp-title { font-weight: bold; color: #1d4ed8; font-size: 13px; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
    .icp-token { font-family: monospace; font-size: 11px; color: #374151; word-break: break-all; background: rgba(255,255,255,0.7); padding: 8px; border-radius: 6px; margin-top: 6px; }
    .icp-lei { font-size: 10px; color: #6b7280; margin-top: 8px; }
    .rodape { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 14px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Saúde <span>360</span></div>
    <div class="subtitulo">Sistema de Gestão em Saúde</div>
  </div>

  <h1>${label}</h1>

  <div class="campo">
    <div class="label">Paciente</div>
    <div class="valor">${ag?.nome || "—"}</div>
  </div>
  <div class="campo">
    <div class="label">CPF</div>
    <div class="valor">${ag?.cpf || "—"}</div>
  </div>
  ${atestado.tipo === "AFASTAMENTO" && atestado.dias_afastamento ? `
  <div class="campo destaque">
    <div class="label">Período de Afastamento</div>
    <div class="valor">${atestado.dias_afastamento} dia(s) consecutivo(s) a contar de ${dataHoje}</div>
  </div>` : ""}
  ${atestado.cid ? `
  <div class="campo">
    <div class="label">Código CID-10</div>
    <div class="valor">${atestado.cid}</div>
  </div>` : ""}
  ${atestado.descricao ? `
  <div class="campo">
    <div class="label">Observações Clínicas</div>
    <div class="valor">${atestado.descricao}</div>
  </div>` : ""}
  <div class="campo">
    <div class="label">Data de Emissão</div>
    <div class="valor">${dataHoje}</div>
  </div>

  <div class="assinatura">
    <p>${medico.nome || "Médico Responsável"}</p>
    <small>${medico.especialidade ? medico.especialidade + " — " : ""}CRM: ${medico.crm || "—"}</small>
  </div>

  ${atestado.assinatura_token ? `
  <div class="icp-box">
    <div class="icp-title">✓ Documento Assinado Digitalmente — ICP-Brasil</div>
    <div class="icp-token">Token de Assinatura: ${atestado.assinatura_token}</div>
    <div class="icp-lei">Documento com validade jurídica conforme MP 2.200-2/2001, Lei 14.063/2020 e Resolução CFM nº 2.299/2021.</div>
  </div>` : ""}

  <div class="rodape">
    Documento gerado pelo sistema Saúde 360 em ${horaAgora} &bull; Para impressão, use Ctrl+P
  </div>
</body>
</html>`;

    const opt = {
      margin:       10,
      filename:     `atestado-${atestado.tipo?.toLowerCase() || "medico"}-${Date.now()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(html).save();
  };

  /* ── Mutation: atestado ── */
  const atestadoMutation = useMutation({
    mutationFn: async () => {
      const prontuario_id = await garantirProntuario();
      return prontuarioApi.emitirAtestado({
        prontuario_id,
        tipo:             atestadoForm.tipo,
        dias_afastamento: atestadoForm.dias_afastamento ? Number(atestadoForm.dias_afastamento) : undefined,
        cid:              atestadoForm.cid || undefined,
        descricao:        atestadoForm.descricao || undefined,
        assinatura_token: atestadoToken || undefined,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["prontuario", agendamento_id] });
      const atestadoCompleto = { ...atestadoForm, assinatura_token: atestadoToken, ...data };
      downloadAtestado(atestadoCompleto);
      setModalAtestado(false);
      setAtestadoForm({ tipo: "AFASTAMENTO", dias_afastamento: "", cid: "", descricao: "" });
      setAtestadoToken(null);
      toast({ title: "✅ Atestado emitido e baixado com sucesso!" });
    },
    onError: (err: any) => toast({ title: "Erro ao emitir atestado", description: err.message, variant: "destructive" }),
  });

  /* ── Mutation: finalizar consulta ── */
  const finalizarMutation = useMutation({
    mutationFn: async () => {
      await garantirProntuario({ finalizado: true, assinatura_token: assinaturaToken });
      return agendamentoApi.atualizarStatus(Number(agendamento_id), "REALIZADO");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos-hoje"] });
      queryClient.invalidateQueries({ queryKey: ["agendamento", Number(agendamento_id)] });
      toast({ title: "✅ Consulta finalizada!", description: "O paciente receberá uma notificação para avaliar o atendimento." });
      navigate("/medico/painel");
    },
    onError: (err: any) => {
      toast({ title: "Erro ao finalizar", description: err.message, variant: "destructive" });
    },
  });

  /* ── Mutation: receita ── */
  const receitaMutation = useMutation({
    mutationFn: async () => {
      const prontuario_id = await garantirProntuario();
      return prontuarioApi.emitirReceita({
        prontuario_id,
        medicamentos: medicamentos.filter(m => m.nome.trim()),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prontuario", agendamento_id] });
      setModalReceita(false); setMedicamentos([medVazio()]);
      toast({ title: "✅ Receita emitida com sucesso!" });
    },
    onError: (err: any) => toast({ title: "Erro ao emitir receita", description: err.message, variant: "destructive" }),
  });

  /* ── Mutation: evolução ── */
  const evolucaoMutation = useMutation({
    mutationFn: async () => {
      const prontuario_id = await garantirProntuario();
      return prontuarioApi.adicionarEvolucao({ prontuario_id, texto: textoEvolucao });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prontuario", agendamento_id] });
      setModalEvolucao(false); setTextoEvolucao("");
      toast({ title: "Evolução adicionada!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  /* ── Mutation: exame ── */
  const exameMutation = useMutation({
    mutationFn: async () => {
      const prontuario_id = await garantirProntuario();
      const exames = listaExames.split("\n").map(s => s.trim()).filter(Boolean);
      return prontuarioApi.pedirExame({ prontuario_id, exames, urgencia: urgenciaExame });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prontuario", agendamento_id] });
      setModalExame(false); setListaExames(""); setUrgenciaExame("ROTINA");
      toast({ title: "Pedido de exame enviado!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  /* ── Loading ── */
  if (loadingAg) {
    return (
      <AppShell title="Atendimento">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        </div>
      </AppShell>
    );
  }

  const ag = agendamento as any;
  const paciente = ag ?? {};
  const receitas      = prontuario?.receitas ?? [];
  const atestados     = prontuario?.atestados ?? [];
  const evolucoes     = prontuario?.evolucoes_prontuario ?? [];
  const pedidosExame  = prontuario?.pedidos_exame ?? [];
  const jaFinalizado  = ag?.status === "REALIZADO" || ag?.status === "CONCLUIDO";

  const alergias: string[] = paciente.alergias
    ? paciente.alergias.split(",").map((a: string) => a.trim()).filter(Boolean)
    : [];

  const initials = (name: string) =>
    name ? name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() : "??";

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <AppShell title="Atendimento ao Vivo">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/medico/painel")}
            className="h-9 w-9 rounded-lg border border-border hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Atendimento</p>
            <h1 className="font-bold text-xl leading-tight">{paciente.nome || "Paciente"}</h1>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {jaFinalizado
              ? <Chip variant="success">Finalizado</Chip>
              : <Chip variant="primary">Em Atendimento</Chip>
            }
          </div>
        </div>

        <div className="flex items-center gap-2">
          {autoSaveLabel === "salvando" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
            </span>
          )}
          {autoSaveLabel === "salvo" && (
            <span className="text-xs text-success flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Salvo
            </span>
          )}

          {!jaFinalizado && (
            <>
              <button
                onClick={() => salvarMutation.mutate(form)}
                disabled={salvarMutation.isPending}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                {salvarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar
              </button>
              <button
                onClick={() => setModalFinalizar(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                Finalizar Consulta
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* ── Coluna Esquerda: Dados do Paciente ── */}
        <aside className="xl:col-span-1 space-y-4">
          {/* Card do Paciente */}
          <div className="card-elevated p-5">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground flex items-center justify-center font-bold text-2xl mb-3 shadow-sm">
                {initials(paciente.nome || "")}
              </div>
              <h3 className="font-semibold leading-tight">{paciente.nome || "—"}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">CPF: {paciente.cpf || "—"}</p>
            </div>

            <div className="space-y-3 text-sm border-t border-border/50 pt-4">
              {paciente.tipo_sanguineo && (
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Tipo sanguíneo</p>
                  <p className="text-sm font-bold text-destructive">{paciente.tipo_sanguineo}</p>
                </div>
              )}
              {[
                { label: "Tipo consulta", value: ag?.tipo_consulta },
                { label: "Horário", value: ag?.horario?.substring(0, 5) },
                { label: "Protocolo", value: ag?.protocolo },
              ].map(r => r.value && (
                <div key={r.label}>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">{r.label}</p>
                  <p className="text-sm font-medium">{r.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alergias */}
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-semibold text-destructive">Alergias</p>
            </div>
            {alergias.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {alergias.map((a) => (
                  <span key={a} className="px-2 py-1 rounded-lg bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma alergia reportada.</p>
            )}
          </div>

          {/* Ações rápidas */}
          {!jaFinalizado && (
            <div className="card-elevated p-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Ações clínicas</p>
              {[
                { icon: Pill,         label: "Emitir Receita",    color: "text-primary",          action: () => { setTab("Receitas"); setModalReceita(true); } },
                { icon: ShieldCheck,  label: "Emitir Atestado",   color: "text-destructive",      action: () => { setTab("Atestados"); setModalAtestado(true); } },
                { icon: Activity,     label: "Adicionar Evolução", color: "text-info",             action: () => { setTab("Evolução"); setModalEvolucao(true); } },
                { icon: ClipboardList,label: "Solicitar Exame",   color: "text-warning",          action: () => { setTab("Exames"); setModalExame(true); } },
                { icon: FileText,     label: "Prontuário completo", color: "text-muted-foreground", action: () => navigate(`/medico/prontuario/${agendamento_id}`) },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-sm transition-colors text-left">
                  <btn.icon className={`h-4 w-4 ${btn.color} shrink-0`} />
                  {btn.label}
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* ── Coluna Principal ── */}
        <div className="xl:col-span-3 space-y-4">
          {/* Tabs */}
          <div className="card-elevated p-1.5 flex flex-wrap gap-1 w-full">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* ── Tab: Queixas ── */}
          {tab === "Queixas & Histórico" && (
            <div className="space-y-4">
              <div className="card-elevated p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  Queixa Principal (informada pelo paciente)
                </h3>
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {prontuario?.queixa || "O paciente não preencheu a queixa principal antes da consulta."}
                  </p>
                </div>
              </div>

              <div className="card-elevated p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-destructive" />
                  Histórico de Saúde
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {[
                    { l: "Tipo sanguíneo", v: paciente.tipo_sanguineo || "Não informado" },
                    { l: "Convênio", v: paciente.convenio_operadora || "Particular" },
                    { l: "Tipo de consulta", v: ag?.tipo_consulta || "—" },
                  ].map(r => (
                    <div key={r.l}>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{r.l}</p>
                      <p>{r.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Prontuário ── */}
          {tab === "Prontuário" && (
            <div className="space-y-4">
              {[
                { label: "Queixa Principal / Anamnese", field: "queixa", rows: 4, placeholder: "Descreva a queixa e história da doença atual..." },
                { label: "Diagnóstico", field: "diagnostico", rows: 2, placeholder: "Diagnóstico conclusivo..." },
                { label: "Conduta / Plano Terapêutico", field: "conduta", rows: 3, placeholder: "Medicamentos prescritos, orientações, retorno..." },
                { label: "CID-10", field: "cid", rows: 1, placeholder: "Ex: J06.9" },
              ].map(f => (
                <div key={f.field} className="card-elevated p-5">
                  <label className="block text-sm font-semibold mb-3">{f.label}</label>
                  {f.rows > 1 ? (
                    <textarea
                      value={(form as any)[f.field]}
                      onChange={e => handleFormChange(f.field, e.target.value)}
                      rows={f.rows}
                      placeholder={f.placeholder}
                      disabled={jaFinalizado}
                      className="w-full px-3.5 py-3 rounded-xl border border-border bg-muted/20 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all disabled:opacity-60"
                    />
                  ) : (
                    <input
                      value={(form as any)[f.field]}
                      onChange={e => handleFormChange(f.field, e.target.value)}
                      placeholder={f.placeholder}
                      disabled={jaFinalizado}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/20 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-60"
                    />
                  )}
                </div>
              ))}

              {/* Retorno */}
              <div className="card-elevated p-5 flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.necessita_retorno}
                    onChange={e => handleFormChange("necessita_retorno", e.target.checked)}
                    disabled={jaFinalizado}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm font-medium">Paciente necessita retorno</span>
                </label>
                {form.necessita_retorno && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Data:</label>
                    <input
                      type="date"
                      value={form.prazo_retorno}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={e => handleFormChange("prazo_retorno", e.target.value)}
                      disabled={jaFinalizado}
                      className="h-9 px-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Receitas ── */}
          {tab === "Receitas" && (
            <div className="card-elevated p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Receitas Emitidas</h3>
                {!jaFinalizado && (
                  <button onClick={() => setModalReceita(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow transition-colors">
                    <Plus className="h-4 w-4" /> Nova Receita
                  </button>
                )}
              </div>
              {receitas.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma receita emitida ainda.</div>
              ) : (
                <div className="space-y-3">
                  {receitas.map((r: any) => (
                    <div key={r.id} className="flex items-start justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                      <div>
                        <p className="text-sm font-medium">
                          {Array.isArray(r.medicamentos)
                            ? r.medicamentos.map((m: any) => `${m.nome}${m.posologia ? ` — ${m.posologia}` : ""}`).join("; ")
                            : String(r.medicamentos || "—")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Emitido em {new Date(r.criado_em).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Exames ── */}
          {tab === "Exames" && (
            <div className="card-elevated p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Pedidos de Exame</h3>
                {!jaFinalizado && (
                  <button onClick={() => setModalExame(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow transition-colors">
                    <Plus className="h-4 w-4" /> Solicitar Exame
                  </button>
                )}
              </div>
              {pedidosExame.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Nenhum exame solicitado.</div>
              ) : (
                <div className="space-y-3">
                  {pedidosExame.map((e: any) => (
                    <div key={e.id} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                      <p className="text-sm font-medium">{Array.isArray(e.exames) ? e.exames.join(", ") : e.exames}</p>
                      <p className="text-xs text-muted-foreground">Urgência: {e.urgencia} · {new Date(e.criado_em).toLocaleDateString("pt-BR")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Atestados ── */}
          {tab === "Atestados" && (
            <div className="card-elevated p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Atestados Emitidos</h3>
                {!jaFinalizado && (
                  <button onClick={() => setModalAtestado(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow transition-colors">
                    <Plus className="h-4 w-4" /> Emitir Atestado
                  </button>
                )}
              </div>
              {atestados.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  Nenhum atestado emitido ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {atestados.map((a: any) => (
                    <div key={a.id} className="flex items-start justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {({
                              AFASTAMENTO: "Atestado de Afastamento",
                              COMPARECIMENTO: "Atestado de Comparecimento",
                              ACOMPANHAMENTO: "Atestado de Acompanhamento",
                              APTIDAO: "Atestado de Aptidão",
                            } as any)[a.tipo] || a.tipo}
                          </p>
                          {a.assinado && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
                              ICP-Brasil
                            </span>
                          )}
                        </div>
                        {a.dias_afastamento && <p className="text-xs text-muted-foreground mt-1">{a.dias_afastamento} dia(s) de afastamento</p>}
                        {a.cid && <p className="text-xs text-muted-foreground">CID: {a.cid}</p>}
                        <p className="text-xs text-muted-foreground mt-1">Emitido em {new Date(a.criado_em).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <button
                        onClick={() => downloadAtestado(a)}
                        className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0 ml-3"
                        title="Baixar atestado"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Evolução ── */}
          {tab === "Evolução" && (
            <div className="card-elevated p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Evoluções Clínicas</h3>
                {!jaFinalizado && (
                  <button onClick={() => setModalEvolucao(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow transition-colors">
                    <Plus className="h-4 w-4" /> Nova Evolução
                  </button>
                )}
              </div>
              {evolucoes.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma evolução registrada.</div>
              ) : (
                <div className="space-y-3">
                  {evolucoes.map((ev: any) => (
                    <div key={ev.id} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">{new Date(ev.criado_em).toLocaleString("pt-BR")}</p>
                      <p className="text-sm whitespace-pre-wrap">{ev.texto}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal: Receita ──────────────────────────────────────── */}
      {modalReceita && (
        <Modal
          title="Emitir Receita Médica"
          onClose={() => { setModalReceita(false); setMedicamentos([medVazio()]); }}
          wide
          footer={
            <>
              <button onClick={() => { setModalReceita(false); setMedicamentos([medVazio()]); }} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
              <button
                onClick={() => receitaMutation.mutate()}
                disabled={!medicamentos.some(m => m.nome.trim()) || receitaMutation.isPending}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary-glow disabled:opacity-50"
              >
                {receitaMutation.isPending ? "Emitindo..." : "Emitir Receita"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Adicione os medicamentos com nome e posologia:</p>
            {medicamentos.map((med, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medicamento {i + 1}</p>
                  {medicamentos.length > 1 && (
                    <button onClick={() => setMedicamentos(prev => prev.filter((_, idx) => idx !== i))} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <input
                  value={med.nome}
                  onChange={e => setMedicamentos(prev => prev.map((m, idx) => idx === i ? { ...m, nome: e.target.value } : m))}
                  placeholder="Nome do medicamento (ex: Amoxicilina 500mg)"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card"
                />
                <input
                  value={med.posologia}
                  onChange={e => setMedicamentos(prev => prev.map((m, idx) => idx === i ? { ...m, posologia: e.target.value } : m))}
                  placeholder="Posologia (ex: 1 cáps. de 8/8h por 7 dias)"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card"
                />
                <input
                  value={med.quantidade}
                  onChange={e => setMedicamentos(prev => prev.map((m, idx) => idx === i ? { ...m, quantidade: e.target.value } : m))}
                  placeholder="Quantidade (ex: 21 cápsulas)"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card"
                />
              </div>
            ))}
            <button
              onClick={() => setMedicamentos(prev => [...prev, medVazio()])}
              className="w-full py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-sm font-medium hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Adicionar outro medicamento
            </button>
          </div>
        </Modal>
      )}

      {/* ─── Modal: Atestado ────────────────────────────────────── */}
      {modalAtestado && (
        <Modal
          title="Emitir Atestado Médico"
          onClose={() => { setModalAtestado(false); setAtestadoToken(null); setAtestadoForm({ tipo: "AFASTAMENTO", dias_afastamento: "", cid: "", descricao: "" }); }}
          wide
          footer={
            <>
              <button
                onClick={() => { setModalAtestado(false); setAtestadoToken(null); setAtestadoForm({ tipo: "AFASTAMENTO", dias_afastamento: "", cid: "", descricao: "" }); }}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={() => atestadoMutation.mutate()}
                disabled={atestadoMutation.isPending || !atestadoToken}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary-glow disabled:opacity-50 flex items-center gap-2"
              >
                {atestadoMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Download className="h-4 w-4" />
                Emitir e Baixar Atestado
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Tipo */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Tipo de Atestado</label>
              <div className="grid grid-cols-2 gap-2">
                {["AFASTAMENTO", "COMPARECIMENTO", "ACOMPANHAMENTO", "APTIDAO"].map(t => (
                  <button
                    key={t}
                    onClick={() => setAtestadoForm(p => ({ ...p, tipo: t }))}
                    className={`py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                      atestadoForm.tipo === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {t === "AFASTAMENTO" ? "Afastamento" : t === "COMPARECIMENTO" ? "Comparecimento" : t === "ACOMPANHAMENTO" ? "Acompanhamento" : "Aptidão"}
                  </button>
                ))}
              </div>
            </div>

            {atestadoForm.tipo === "AFASTAMENTO" && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Dias de Afastamento</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={atestadoForm.dias_afastamento}
                  onChange={e => setAtestadoForm(p => ({ ...p, dias_afastamento: e.target.value }))}
                  placeholder="Ex: 3"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">CID-10 (opcional)</label>
              <input
                value={atestadoForm.cid}
                onChange={e => setAtestadoForm(p => ({ ...p, cid: e.target.value }))}
                placeholder="Ex: J06.9"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Descrição / Observações (opcional)</label>
              <textarea
                value={atestadoForm.descricao}
                onChange={e => setAtestadoForm(p => ({ ...p, descricao: e.target.value }))}
                placeholder="Informações adicionais sobre o atestado..."
                rows={3}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            {/* Assinatura Digital ICP-Brasil */}
            <div className="rounded-xl border border-border p-5 bg-muted/20">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Assinatura Digital ICP-Brasil</p>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium border border-blue-200">Obrigatória</span>
              </div>

              {atestadoToken ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
                  <p className="font-semibold text-green-800">Documento Assinado com Sucesso</p>
                  <p className="text-xs text-green-700 font-mono break-all">{atestadoToken}</p>
                  <p className="text-[10px] text-green-600">Validade jurídica conforme MP 2.200-2/2001 e Lei 14.063/2020</p>
                </div>
              ) : (
                <ICPBrasilSignature onSign={(token) => setAtestadoToken(token)} />
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Modal: Evolução ─────────────────────────────────────── */}
      {modalEvolucao && (
        <Modal
          title="Adicionar Evolução Clínica"
          onClose={() => setModalEvolucao(false)}
          footer={
            <>
              <button onClick={() => setModalEvolucao(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
              <button
                onClick={() => evolucaoMutation.mutate()}
                disabled={!textoEvolucao.trim() || evolucaoMutation.isPending}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary-glow disabled:opacity-50"
              >
                {evolucaoMutation.isPending ? "Salvando..." : "Salvar Evolução"}
              </button>
            </>
          }
        >
          <textarea
            className="w-full border border-border rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-muted/10 h-32 resize-none"
            placeholder="Descreva a evolução do quadro clínico do paciente..."
            value={textoEvolucao}
            onChange={e => setTextoEvolucao(e.target.value)}
            autoFocus
          />
        </Modal>
      )}

      {/* ─── Modal: Exame ────────────────────────────────────────── */}
      {modalExame && (
        <Modal
          title="Solicitar Exames"
          onClose={() => setModalExame(false)}
          footer={
            <>
              <button onClick={() => setModalExame(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
              <button
                onClick={() => exameMutation.mutate()}
                disabled={!listaExames.trim() || exameMutation.isPending}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary-glow disabled:opacity-50"
              >
                {exameMutation.isPending ? "Enviando..." : "Solicitar Exames"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Urgência</label>
              <div className="grid grid-cols-3 gap-2">
                {["ROTINA", "URGENTE", "EMERGÊNCIA"].map(u => (
                  <button
                    key={u}
                    onClick={() => setUrgenciaExame(u)}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      urgenciaExame === u ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Exames solicitados (um por linha)</label>
              <textarea
                className="w-full border border-border rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-muted/10 h-32 resize-none"
                placeholder={"Hemograma completo\nGlicemia em jejum\nColesterol total e frações"}
                value={listaExames}
                onChange={e => setListaExames(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Modal: Finalizar ────────────────────────────────────── */}
      {modalFinalizar && (
        <Modal
          title="Finalizar e Assinar Digitalmente"
          onClose={() => { setModalFinalizar(false); setAssinaturaToken(null); }}
          wide
          footer={
            <>
              <button onClick={() => { setModalFinalizar(false); setAssinaturaToken(null); }} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
              <button
                onClick={() => finalizarMutation.mutate()}
                disabled={finalizarMutation.isPending || !assinaturaToken}
                className="px-5 py-2 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50 flex items-center gap-2"
              >
                {finalizarMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <CheckCircle2 className="h-4 w-4" />
                Finalizar Consulta
              </button>
            </>
          }
        >
          <div className="space-y-5">
            <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/20">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-2" />
              <p className="font-semibold">Confirmar encerramento da consulta</p>
              <p className="text-sm text-muted-foreground mt-1">
                O prontuário será assinado digitalmente e o paciente receberá uma notificação para avaliar o atendimento.
              </p>
            </div>

            {/* Assinatura ICP-Brasil */}
            <div className="rounded-xl border border-border p-5 bg-muted/20">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Assinatura Digital ICP-Brasil</p>
              </div>

              {assinaturaToken ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
                  <p className="font-semibold text-green-800">Documento Assinado com Sucesso</p>
                  <p className="text-xs text-green-700 font-mono break-all">{assinaturaToken}</p>
                </div>
              ) : (
                <ICPBrasilSignature onSign={(token) => setAssinaturaToken(token)} />
              )}
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
};

export default AtendimentoMedico;
