import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Chip } from "@/components/shared/PageHeader";
import { FileText, Pill, Activity, Stethoscope, Plus, AlertTriangle, Calendar, Heart, Download, Edit3, Loader2, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { prontuarioApi, agendamentoApi } from "@/lib/api";
import { useAgendamento } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import html2pdf from "html2pdf.js";
const tabs = ["Resumo", "Evoluções", "Receitas", "Exames", "Atestados"];

/** Gera e faz download de um PDF bonitinho usando html2pdf.js */
function downloadPdf(nomeArquivo: string, titulo: string, pacienteNome: string, medicoNome: string, conteudo: string, extraHtml: string = "") {
  const dataHoje = new Date().toLocaleDateString("pt-BR");
  const horaAgora = new Date().toLocaleString("pt-BR");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; padding: 40px; color: #1a1a1a; background: #fff; }
    .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 24px; margin-bottom: 32px; }
    .logo { font-size: 26px; font-weight: bold; color: #2563eb; letter-spacing: -0.5px; }
    .logo span { color: #0ea5e9; }
    .subtitulo { font-size: 12px; color: #64748b; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; }
    h1 { font-size: 22px; font-weight: bold; margin-bottom: 28px; color: #0f172a; text-align: center; text-transform: uppercase; }
    .info-grid { display: flex; gap: 20px; margin-bottom: 24px; }
    .campo { flex: 1; padding: 14px 16px; border-left: 3px solid #2563eb; background: #f8fafc; border-radius: 0 8px 8px 0; }
    .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: bold; margin-bottom: 4px; }
    .valor { font-size: 16px; color: #0f172a; font-weight: 500; }
    .content-box { margin: 16px 0; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; line-height: 1.6; font-size: 14px; white-space: pre-wrap; background: #fff; }
    .assinatura { margin-top: 60px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 24px; width: 60%; margin-left: auto; margin-right: auto; }
    .assinatura p { font-size: 15px; font-weight: bold; color: #0f172a; }
    .assinatura small { font-size: 12px; color: #64748b; display: block; margin-top: 4px; }
    .rodape { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 14px; }
    .icp-box { margin-top: 24px; background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 1.5px solid #2563eb; border-radius: 12px; padding: 18px; }
    .icp-title { font-weight: bold; color: #1d4ed8; font-size: 13px; margin-bottom: 8px; }
    .icp-token { font-family: monospace; font-size: 11px; color: #374151; word-break: break-all; background: rgba(255,255,255,0.7); padding: 8px; border-radius: 6px; margin-top: 6px; }
    .icp-lei { font-size: 10px; color: #6b7280; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Saúde <span>360</span></div>
    <div class="subtitulo">Sistema de Gestão em Saúde</div>
  </div>
  
  <h1>${titulo}</h1>
  
  <div class="info-grid">
    <div class="campo">
      <div class="label">Paciente</div>
      <div class="valor">${pacienteNome || "Não informado"}</div>
    </div>
    <div class="campo">
      <div class="label">Data</div>
      <div class="valor">${dataHoje}</div>
    </div>
  </div>

  <div class="content-box">
${conteudo}
  </div>

  ${extraHtml}

  <div class="assinatura">
    <p>Dr(a). ${medicoNome || "Médico Responsável"}</p>
    <small>Documento Assinado Eletronicamente</small>
  </div>

  <div class="rodape">
    Documento gerado pelo sistema Saúde 360 em ${horaAgora}
  </div>
</body>
</html>`;

  const opt = {
    margin:       10,
    filename:     nomeArquivo,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(html).save();
}

/** Extrai texto legível de uma receita parseada */
function extrairTextoReceita(rec: any): string {
  if (rec.raw) return rec.raw;
  if (Array.isArray(rec.medicamentos)) {
    return rec.medicamentos.map((m: any) =>
      typeof m === "string" ? m : `${m.nome || m.medicamento || JSON.stringify(m)}`
    ).join("\n");
  }
  if (rec.medicamentos && typeof rec.medicamentos === "string") return rec.medicamentos;
  for (const c of ["texto", "descricao", "conteudo", "medicamento"]) {
    if (rec[c]) return String(rec[c]);
  }
  return JSON.stringify(rec, null, 2);
}

/** Extrai texto legível de um atestado parseado */
function extrairTextoAtestado(at: any): string {
  if (at.raw) return at.raw;
  const partes: string[] = [];
  if (at.dias) partes.push(`Período de afastamento: ${at.dias} dia(s)`);
  if (at.cid) partes.push(`CID: ${at.cid}`);
  if (at.motivo) partes.push(`Motivo: ${at.motivo}`);
  if (at.observacoes) partes.push(`Observações: ${at.observacoes}`);
  if (partes.length) return partes.join("\n");
  for (const c of ["texto", "descricao", "conteudo"]) {
    if (at[c]) return String(at[c]);
  }
  return JSON.stringify(at, null, 2);
}

const Prontuario = () => {
  const { agendamento_id } = useParams<{ agendamento_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [tab, setTab] = useState("Resumo");
  
  const [modalEvolucao, setModalEvolucao] = useState(false);
  const [textoEvolucao, setTextoEvolucao] = useState("");
  const [modalReceita, setModalReceita] = useState(false);
  const [textoReceita, setTextoReceita] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ anamnese: "", exame_fisico: "", hipotese_diagnostica: "" });

  const { data: prontuarioData, isLoading: loadingProntuario } = useQuery({
    queryKey: ['prontuario', agendamento_id],
    queryFn: () => prontuarioApi.buscarPorAgendamento(Number(agendamento_id)),
    enabled: !!agendamento_id
  });

  const { data: agendamentoData } = useAgendamento(Number(agendamento_id));

  const startEdit = () => {
    setForm({
      anamnese: prontuarioData?.anamnese || prontuarioData?.queixa || "",
      exame_fisico: prontuarioData?.exame_fisico || "",
      hipotese_diagnostica: prontuarioData?.hipotese_diagnostica || prontuarioData?.diagnostico || prontuarioData?.cid || ""
    });
    setIsEditing(true);
  };

  const salvarProntuario = useMutation({
    mutationFn: (dados: any) => prontuarioApi.salvar({ ...dados, agendamento_id: Number(agendamento_id), paciente_cpf: agendamentoData?.cpf }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prontuario', agendamento_id] });
      setIsEditing(false);
      toast({ title: "Prontuário salvo com sucesso!" });
    },
    onError: (err: any) => toast({ title: "Erro ao salvar prontuário", description: err.message, variant: "destructive" })
  });

  const finalizarConsulta = useMutation({
    mutationFn: async () => {
      if (prontuarioData?.id) {
        await prontuarioApi.salvar({ id: prontuarioData.id, status: 'FINALIZADO' });
      }
      return agendamentoApi.atualizarStatus(Number(agendamento_id), 'REALIZADO');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamento', Number(agendamento_id)] });
      queryClient.invalidateQueries({ queryKey: ['prontuario', agendamento_id] });
      toast({ title: "Consulta finalizada!" });
      navigate('/medico/painel');
    }
  });

  const evolucaoMutation = useMutation({
    mutationFn: (texto: string) => prontuarioApi.adicionarEvolucao({ prontuario_id: prontuarioData?.id, texto }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prontuario', agendamento_id] });
      setModalEvolucao(false);
      setTextoEvolucao("");
      toast({ title: "Evolução adicionada com sucesso" });
    },
    onError: () => toast({ title: "Erro ao adicionar evolução", variant: "destructive" })
  });

  const receitaMutation = useMutation({
    mutationFn: (medicamentos: any) => prontuarioApi.emitirReceita({ prontuario_id: prontuarioData?.id, medicamentos }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prontuario', agendamento_id] });
      setModalReceita(false);
      setTextoReceita("");
      toast({ title: "Receita emitida com sucesso" });
    },
    onError: () => toast({ title: "Erro ao emitir receita", variant: "destructive" })
  });

  if (loadingProntuario) {
    return (
      <AppShell title="Prontuário Eletrônico">
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary/60 mb-4" />
          <p className="text-muted-foreground">Carregando dados do paciente...</p>
        </div>
      </AppShell>
    );
  }

  const pacienteInfo = {
    ...( agendamentoData?.pacientes || {} ),
    nome: agendamentoData?.pacientes?.nome || agendamentoData?.nome || user?.nome || "Paciente",
    cpf:  agendamentoData?.pacientes?.cpf  || agendamentoData?.cpf  || user?.cpf  || "",
  };
  const resumo = prontuarioData || {};
  const evolucoes = prontuarioData?.evolucoes_prontuario || [];
  const receitas = prontuarioData?.receitas || [];
  const exames = prontuarioData?.pedidos_exame || [];
  const atestados = prontuarioData?.atestados || [];
  const isMedico = user?.papel === "medico";

  return (
    <AppShell title="Prontuário Eletrônico">
      <PageHeader
        eyebrow="Paciente"
        title={pacienteInfo.nome || "Paciente"}
        description={`CPF ${pacienteInfo.cpf || "Não informado"} · ${pacienteInfo.convenio_operadora || "Particular"}`}
        actions={
          <>
            <button onClick={() => navigate(user?.papel === 'paciente' ? '/paciente/historico' : '/medico/painel')} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Voltar</button>
            {isMedico && (
              <>
                <button onClick={() => setModalEvolucao(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-soft text-primary text-sm font-medium hover:bg-primary-soft/80 transition-colors shadow-sm"><Plus className="h-4 w-4"/> Nova evolução</button>
                {agendamentoData?.status !== "REALIZADO" && (
                  <button onClick={() => finalizarConsulta.mutate()} disabled={finalizarConsulta.isPending} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow transition-colors shadow-sm">
                    Finalizar Consulta
                  </button>
                )}
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <aside className="card-elevated p-5 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-primary-soft text-primary flex items-center justify-center text-2xl font-semibold mb-3">
              {pacienteInfo.nome ? pacienteInfo.nome.split(" ").map((n: string) => n[0]).slice(0,2).join("") : "??"}
            </div>
            <h3 className="font-semibold">{pacienteInfo.nome || "—"}</h3>
            <p className="text-xs text-muted-foreground">{pacienteInfo.sexo || "Não informado"} · Tipo Sang.: {pacienteInfo.tipo_sanguineo || "Não informado"}</p>
            <div className="flex gap-2 mt-3">
              <Chip variant="success">Ativo</Chip>
            </div>
          </div>
          <div className="border-t border-border/50 mt-5 pt-5 space-y-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Telefone</p><p className="font-medium">{pacienteInfo.whatsapp || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">E-mail</p><p className="font-medium truncate">{pacienteInfo.email || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Endereço</p><p className="font-medium">{pacienteInfo.cidade || "—"}</p></div>
          </div>
          <div className="border-t border-border/50 mt-5 pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Alergias</p>
            <div className="flex flex-wrap gap-1.5">
              {pacienteInfo.alergias ? pacienteInfo.alergias.split(',').map((a: string) => (
                <Chip key={a} variant="destructive">{a.trim()}</Chip>
              )) : <span className="text-sm text-muted-foreground">Nenhuma reportada</span>}
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3 space-y-6">
          <div className="card-elevated p-1.5 inline-flex flex-wrap gap-1 w-full overflow-x-auto scroll-hide">
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t ? "bg-primary text-primary-foreground shadow-sm" : "text-subtle-foreground hover:bg-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Resumo" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Pressão", value: resumo?.pressao_arterial || "—", icon: Heart },
                  { label: "Freq. Card.", value: resumo?.frequencia_cardiaca ? `${resumo.frequencia_cardiaca} bpm` : "—", icon: Activity },
                  { label: "Temp.", value: resumo?.temperatura ? `${resumo.temperatura}°C` : "—", icon: Activity },
                  { label: "Peso", value: pacienteInfo.peso ? `${pacienteInfo.peso} kg` : "—", icon: Activity },
                ].map(s => (
                  <div key={s.label} className="card-elevated p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <s.icon className="h-4 w-4 text-primary" />
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    </div>
                    <p className="text-xl font-semibold">{s.value}</p>
                  </div>
                ))}
              </div>

              <section className="card-elevated">
                <div className="flex items-center justify-between p-5 border-b border-border/60">
                  <h3 className="font-semibold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Avaliação Atual</h3>
                  {!isEditing && isMedico && <button onClick={startEdit} className="text-sm text-primary hover:underline">Editar Prontuário</button>}
                </div>
                <div className="p-5 text-sm text-subtle-foreground leading-relaxed space-y-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <strong className="text-foreground block mb-1">Anamnese / Queixa Principal:</strong>
                        <textarea className="w-full border rounded-lg p-3 h-24" value={form.anamnese} onChange={e => setForm({...form, anamnese: e.target.value})} />
                      </div>
                      <div>
                        <strong className="text-foreground block mb-1">Exame Físico:</strong>
                        <textarea className="w-full border rounded-lg p-3 h-24" value={form.exame_fisico} onChange={e => setForm({...form, exame_fisico: e.target.value})} />
                      </div>
                      <div>
                        <strong className="text-foreground block mb-1">Hipótese Diagnóstica (CID):</strong>
                        <input className="w-full border rounded-lg p-3" value={form.hipotese_diagnostica} onChange={e => setForm({...form, hipotese_diagnostica: e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                        <button onClick={() => salvarProntuario.mutate({ id: resumo?.id, ...form })} className="px-4 py-2 bg-primary text-white rounded-lg">Salvar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <strong className="text-foreground block mb-1">Anamnese / Queixa Principal:</strong>
                        <p>{resumo?.anamnese || resumo?.queixa || "Nenhum registro encontrado."}</p>
                      </div>
                      {resumo?.exame_fisico && (
                        <div>
                          <strong className="text-foreground block mb-1">Exame Físico:</strong>
                          <p>{resumo.exame_fisico}</p>
                        </div>
                      )}
                      {(resumo?.hipotese_diagnostica || resumo?.diagnostico || resumo?.cid) && (
                        <div>
                          <strong className="text-foreground block mb-1">Hipótese Diagnóstica (CID):</strong>
                          <p>{resumo.hipotese_diagnostica || resumo.diagnostico || resumo.cid}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            </>
          )}

          {tab === "Evoluções" && (
            <div className="space-y-4">
              {evolucoes.length === 0 ? (
                <div className="card-elevated p-8 text-center text-muted-foreground">Nenhuma evolução registrada.</div>
              ) : (
                evolucoes.map((evo: any) => (
                  <section key={evo.id} className="card-elevated p-5">
                    <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
                      <span className="text-sm font-medium">{new Date(evo.criado_em).toLocaleDateString('pt-BR')} às {new Date(evo.criado_em).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                      <Chip variant="primary">Dr(a). {evo.medico?.nome || "Médico"}</Chip>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{evo.descricao || evo.texto}</p>
                  </section>
                ))
              )}
            </div>
          )}

          {tab === "Receitas" && (
            <div className="space-y-4">
              {isMedico && (
                <div className="flex justify-end mb-4">
                  <button onClick={() => setModalReceita(true)} className="text-sm bg-primary text-white px-4 py-2 rounded-lg inline-flex items-center gap-1.5">
                    <Plus className="h-4 w-4" /> Emitir Receita
                  </button>
                </div>
              )}
              {receitas.length === 0 ? (
                <div className="card-elevated p-8 text-center text-muted-foreground">
                  <Pill className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma receita registrada para esta consulta.</p>
                </div>
              ) : (
                receitas.map((rec: any) => {
                  const textoLegivel = extrairTextoReceita(rec);
                  const dataEmissao = new Date(rec.criado_em).toLocaleDateString('pt-BR');
                  return (
                    <div key={rec.id} className="card-elevated p-5">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Pill className="h-4 w-4 text-primary shrink-0" />
                            <h4 className="font-semibold text-sm">Receita Médica</h4>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-3 text-sm whitespace-pre-wrap text-foreground leading-relaxed border border-border/40">
                            {textoLegivel}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Emitido em {dataEmissao}</p>
                        </div>
                        <button
                          onClick={() => downloadPdf(
                            `receita-${rec.id}.pdf`,
                            "Receita Médica",
                            pacienteInfo?.nome,
                            resumo?.medicos?.nome,
                            textoLegivel
                          )}
                          className="shrink-0 h-9 w-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                          title="Baixar receita"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "Exames" && (
            <div className="space-y-4">
              {exames.length === 0 ? (
                <div className="card-elevated p-8 text-center text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum pedido de exame registrado.</p>
                </div>
              ) : (
                exames.map((ex: any) => {
                  const textoEx = ex.raw || ex.exames || ex.descricao || ex.texto || JSON.stringify(ex, null, 2);
                  const dataEx = new Date(ex.criado_em).toLocaleDateString('pt-BR');
                  return (
                    <div key={ex.id} className="card-elevated p-5 flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="h-4 w-4 text-info shrink-0" />
                          <h4 className="font-semibold text-sm">Pedido de Exame</h4>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 text-sm whitespace-pre-wrap text-foreground border border-border/40">
                          {textoEx}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Solicitado em {dataEx}</p>
                      </div>
                      <button
                        onClick={() => downloadPdf(
                          `pedido-exame-${ex.id}.pdf`,
                          "Pedido de Exame",
                          pacienteInfo?.nome,
                          resumo?.medicos?.nome,
                          textoEx
                        )}
                        className="shrink-0 h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center hover:bg-info hover:text-white transition-colors"
                        title="Baixar pedido"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "Atestados" && (
            <div className="space-y-4">
              {atestados.length === 0 ? (
                <div className="card-elevated p-8 text-center text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum atestado emitido para esta consulta.</p>
                </div>
              ) : (
                atestados.map((at: any) => {
                  const textoAt = extrairTextoAtestado(at);
                  const dataEmissao = new Date(at.criado_em).toLocaleDateString('pt-BR');
                  const medNome = resumo?.medicos?.nome || "Médico";
                  const medCRM = resumo?.medicos?.crm || "";
                  const conteudoDownload = [
                    "ATESTADO MÉDICO",
                    "=".repeat(40),
                    `Data de emissão: ${dataEmissao}`,
                    `Médico: Dr(a). ${medNome}`,
                    medCRM ? `CRM: ${medCRM}` : null,
                    "=".repeat(40),
                    "",
                    textoAt,
                    "",
                    "=".repeat(40),
                    "Saúde 360 — Documento gerado eletronicamente",
                    at.assinado && at.assinatura_token ? "Documento Assinado Digitalmente — ICP-Brasil" : null,
                    at.assinado && at.assinatura_token ? `Token: ${at.assinatura_token}` : null,
                    at.assinado && at.assinatura_token ? "Validado conforme MP 2.200-2/2001, Lei 14.063/2020 e Resolução CFM nº 2.299/2021." : null
                  ].filter(Boolean).join("\n");

                  return (
                    <div key={at.id} className="card-elevated p-5">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-success shrink-0" />
                            <h4 className="font-semibold text-sm">Atestado Médico</h4>
                            {at.assinado && <Chip variant="success">Assinado</Chip>}
                          </div>
                          <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap text-foreground leading-relaxed border border-border/40">
                            {textoAt}
                          </div>
                          <p className="text-xs text-muted-foreground mt-3">
                            Emitido em {dataEmissao} · Dr(a). {medNome}
                            {medCRM && ` · CRM ${medCRM}`}
                          </p>
                          
                          {at.assinado && at.assinatura_token && (
                            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 relative overflow-hidden">
                              <div className="absolute right-0 top-0 opacity-10 pt-2 pr-2">
                                <CheckCircle className="h-16 w-16 text-blue-700" />
                              </div>
                              <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm mb-2 relative z-10">
                                <CheckCircle className="h-4 w-4" />
                                Documento Assinado Digitalmente — ICP-Brasil
                              </div>
                              <div className="font-mono text-[11px] text-slate-700 bg-white/70 p-2.5 rounded border border-blue-100 break-all relative z-10">
                                <span className="font-semibold text-blue-800">Token:</span> {at.assinatura_token}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-2 relative z-10 leading-tight">
                                Documento com validade jurídica conforme MP 2.200-2/2001, Lei 14.063/2020 e Resolução CFM nº 2.299/2021. Pode ser validado no portal do ITI.
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            const icpHtml = at.assinado && at.assinatura_token ? `
                              <div class="icp-box">
                                <div class="icp-title">✓ Documento Assinado Digitalmente — ICP-Brasil</div>
                                <div class="icp-token">Token: ${at.assinatura_token}</div>
                                <div class="icp-lei">Documento com validade jurídica conforme MP 2.200-2/2001, Lei 14.063/2020 e Resolução CFM nº 2.299/2021.</div>
                              </div>
                            ` : "";
                            downloadPdf(
                              `atestado-${at.id}.pdf`,
                              "Atestado Médico",
                              pacienteInfo?.nome,
                              medNome,
                              textoAt,
                              icpHtml
                            );
                          }}
                          className="shrink-0 h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center hover:bg-success hover:text-white transition-colors"
                          title="Baixar atestado"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      </div>

      {modalEvolucao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-muted/20">
              <h3 className="font-semibold">Adicionar Evolução</h3>
              <button onClick={() => setModalEvolucao(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-4">
              <textarea 
                className="w-full border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-muted/10 h-32 resize-none" 
                placeholder="Descreva a evolução clínica do paciente..."
                value={textoEvolucao}
                onChange={(e) => setTextoEvolucao(e.target.value)}
              />
            </div>
            <div className="p-4 border-t border-border/50 bg-muted/20 flex justify-end gap-2">
              <button onClick={() => setModalEvolucao(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
              <button 
                onClick={() => evolucaoMutation.mutate(textoEvolucao)} 
                disabled={!textoEvolucao.trim() || evolucaoMutation.isPending}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-glow disabled:opacity-50"
              >
                {evolucaoMutation.isPending ? "Salvando..." : "Salvar Evolução"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalReceita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-muted/20">
              <h3 className="font-semibold">Emitir Receita</h3>
              <button onClick={() => setModalReceita(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-4">
              <textarea 
                className="w-full border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-muted/10 h-32 resize-none" 
                placeholder="Ex: Paracetamol 500mg, tomar 1 de 8/8h por 5 dias..."
                value={textoReceita}
                onChange={(e) => setTextoReceita(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-2">As receitas são registradas como texto e podem ser baixadas pelo paciente.</p>
            </div>
            <div className="p-4 border-t border-border/50 bg-muted/20 flex justify-end gap-2">
              <button onClick={() => setModalReceita(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
              <button 
                onClick={() => receitaMutation.mutate([{ nome: textoReceita }])} 
                disabled={!textoReceita.trim() || receitaMutation.isPending}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-glow disabled:opacity-50"
              >
                {receitaMutation.isPending ? "Emitindo..." : "Emitir Receita"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default Prontuario;
