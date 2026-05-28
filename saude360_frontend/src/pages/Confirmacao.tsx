import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Calendar, Clock, MapPin, Video, User, Stethoscope, FileCheck2, ArrowRight, Loader2, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCriarAgendamento, usePerfil } from "@/hooks/useApi";
import { useState, useMemo, useEffect } from "react";

// ── Tabela de descontos por convênio (confirmado pelo cliente) ─────────────────
const DESCONTOS: Record<string, number> = {
  "Unimed": 0.20,
  "Hapvida": 0.15,
  "Bradesco Saúde": 0.10,
  "SulAmérica": 0,
  "Amil": 0,
  "Porto Seguro": 0,
  "Particular": 0,
};

const Confirmacao = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const criarAgendamento = useCriarAgendamento();
  const { data: perfilData } = usePerfil();
  
  const [obs, setObs] = useState("");
  const [aceito, setAceito] = useState(true);
  const [convenio, setConvenio] = useState("");

  const [carteirinha, setCarteirinha] = useState("");
  const [nomeTitular, setNomeTitular] = useState("");
  const [validadePlano, setValidadePlano] = useState("");
  const [carteirinhaErr, setCarteirinhaErr] = useState("");

  useEffect(() => {
    if (perfilData?.convenio_operadora) {
      setConvenio(perfilData.convenio_operadora);
      setCarteirinha(perfilData.convenio_numero || "");
      const storedTitular = localStorage.getItem("@saude360:convenioTitular");
      setNomeTitular(perfilData.convenio_titular || storedTitular || user?.nome || "");
      setValidadePlano(perfilData.convenio_validade ? perfilData.convenio_validade.substring(0, 7) : "");
    }
  }, [perfilData, user]);

  const medicoId = params.get("medico_id") ? Number(params.get("medico_id")) : undefined;
  const medicoNome = params.get("medico_nome") ?? "Médico selecionado";
  const medicoCRM = params.get("medico_crm") ?? "";
  const especialidade = params.get("especialidade") ?? "";
  const slotId = params.get("slot_id") ? Number(params.get("slot_id")) : undefined;
  const data = params.get("data") ?? "";
  const horario = params.get("horario") ?? "";
  const tiposConsultaParam = params.get("tipos_consulta") ?? "PRESENCIAL";
  const tiposPermitidos = tiposConsultaParam.split(",").map(t => t.trim().toUpperCase()).filter(t => ["PRESENCIAL", "TELECONSULTA"].includes(t));
  const tipoEscolhidoParam = params.get("tipo_consulta") as "PRESENCIAL" | "TELECONSULTA" | null;
  const [tipoSelecionado, setTipoSelecionado] = useState<"PRESENCIAL" | "TELECONSULTA">(
    tipoEscolhidoParam ?? (tiposPermitidos.includes("PRESENCIAL") ? "PRESENCIAL" : "TELECONSULTA")
  );
  const valorBase = Number(params.get("valor") ?? 60);

  const motivo = params.get("motivo") || "Consulta";

  // Cálculo de desconto simulado apenas para preview
  const desconto = useMemo(() => {
    if (!convenio || convenio === "Particular") return 0;
    return DESCONTOS[convenio] ?? 0;
  }, [convenio]);

  const valorDesconto = valorBase * desconto;
  const valorFinal = valorBase - valorDesconto;

  const handleConfirmar = async () => {
    if (!aceito) return;
    
    if (convenio && convenio !== "Particular") {
      if (!carteirinha || !nomeTitular || !validadePlano) {
        setCarteirinhaErr("Preencha todos os dados do convênio");
        return;
      }
    }

    const res = await criarAgendamento.mutateAsync({
      nome: user?.nome ?? "",
      cpf: user?.cpf ?? "",
      medico_id: medicoId,
      slot_id: slotId,
      data_consulta: data || undefined,
      horario: horario || undefined,
      tipo_consulta: tipoSelecionado,
      valor: valorFinal,
    });
    const ag = res.agendamento;
    navigate(`/paciente/pagamento?agendamento_id=${ag.id}&nome=${encodeURIComponent(user?.nome ?? "")}&cpf=${user?.cpf ?? ""}`, {
      state: {
        convenio, carteirinha, nome_titular: nomeTitular, validade_plano: validadePlano, valorPreview: valorFinal, motivo, tipo_consulta: tipoSelecionado
      }
    });
  };

  return (
    <AppShell title="Confirmação de Agendamento">
      <PageHeader
        eyebrow="Passo 3 de 4"
        title="Confirme sua consulta"
        description="Revise as informações antes de prosseguir para o pagamento."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <section className="space-y-6">
          <div className="card-elevated p-6 lg:p-8 bg-gradient-to-br from-primary-soft/40 to-card border-l-4 border-l-primary">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
                <FileCheck2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs text-primary font-semibold uppercase tracking-wider">Quase lá!</p>
                <h2 className="text-xl font-semibold mt-1">{especialidade ? `${motivo} de ${especialidade}` : motivo}</h2>
                <p className="text-sm text-muted-foreground mt-1">{medicoNome}{medicoCRM && ` · CRM ${medicoCRM}`}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {[
                { icon: Calendar, label: "Data", value: data ? new Date(data + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "A confirmar" },
                { icon: Clock, label: "Horário", value: horario || "A confirmar" },
              ].map(i => (
                <div key={i.label} className="flex items-start gap-3 p-3 rounded-lg bg-card/60">
                  <i.icon className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{i.label}</p>
                    <p className="text-sm font-medium">{i.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Seletor de modalidade — apenas opções disponíveis do médico */}
            {tiposPermitidos.length > 1 ? (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Modalidade</p>
                <div className="grid grid-cols-2 gap-2">
                  {tiposPermitidos.map(t => (
                    <button
                      key={t}
                      onClick={() => setTipoSelecionado(t as "PRESENCIAL" | "TELECONSULTA")}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                        tipoSelecionado === t
                          ? "bg-primary/10 border-primary text-primary"
                          : "border-border hover:border-primary/40 text-muted-foreground"
                      }`}
                    >
                      {t === "TELECONSULTA" ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                      {t === "TELECONSULTA" ? "Teleconsulta" : "Presencial"}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-card/60">
                {tipoSelecionado === "TELECONSULTA" ? <Video className="h-4 w-4 text-primary" /> : <MapPin className="h-4 w-4 text-primary" />}
                <span>Modalidade: <strong className="text-foreground">{tipoSelecionado === "TELECONSULTA" ? "Teleconsulta (vídeo)" : "Presencial"}</strong></span>
              </div>
            )}
          </div>

          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Paciente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Nome</p><p className="font-medium">{user?.nome}</p></div>
              <div><p className="text-xs text-muted-foreground">E-mail</p><p className="font-medium">{user?.email}</p></div>
              {user?.cpf && <div><p className="text-xs text-muted-foreground">CPF</p><p className="font-medium">{String(user.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</p></div>}
            </div>
          </div>

          {/* Convênio / Desconto */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Plano de Saúde / Convênio
            </h3>
            {convenio && convenio !== "Particular" ? (
              <div className="p-4 rounded-lg bg-success-soft/40 border border-success/20 flex flex-col gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-success" />
                  <span className="text-success font-semibold">
                    Convênio Selecionado: {convenio}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 mt-2">
                  <input type="text" placeholder="Número da carteirinha" value={carteirinha} onChange={e => setCarteirinha(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border text-sm" />
                  <input type="text" placeholder="Nome do titular" value={nomeTitular} onChange={e => setNomeTitular(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border text-sm" />
                  <input type="month" placeholder="Validade (MM/AAAA)" value={validadePlano} onChange={e => setValidadePlano(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border text-sm" />
                </div>
                {carteirinhaErr && <p className="text-destructive text-xs">{carteirinhaErr}</p>}
                <p className="text-success/80 mt-1 text-xs">
                  A validação será feita no servidor. Desconto estimado: {(desconto * 100).toFixed(0)}%.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/40 border border-border text-sm text-muted-foreground flex items-center gap-3">
                <Shield className="h-8 w-8 text-muted-foreground/40 shrink-0" />
                <p>Nenhum convênio selecionado. A consulta será particular. <Link to="/paciente/meus-dados" className="text-primary hover:underline font-medium">Atualize seus dados</Link> para salvar um convênio.</p>
              </div>
            )}
          </div>

          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-3">Observações para o médico (opcional)</h3>
            <textarea rows={3} value={obs} onChange={e => setObs(e.target.value)}
              placeholder="Sintomas, dúvidas ou informações relevantes..."
              className="w-full p-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>

          <label className="card-elevated p-4 flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={aceito} onChange={e => setAceito(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary" />
            <span className="text-sm text-subtle-foreground">
              Concordo com a política de cancelamento e os termos de atendimento da clínica.
            </span>
          </label>
        </section>

        <aside className="card-elevated p-6 h-fit lg:sticky lg:top-24">
          <h3 className="font-semibold mb-4">Resumo financeiro</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consulta</span>
              <span className="font-medium">R$ {valorBase.toFixed(2).replace(".", ",")}</span>
            </div>
            {desconto > 0 && (
              <div className="flex justify-between text-success">
                <span>Desconto {convenio}</span>
                <span className="font-medium">- R$ {valorDesconto.toFixed(2).replace(".", ",")}</span>
              </div>
            )}
            <div className="border-t border-border/60 pt-2.5 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-semibold text-primary text-lg">R$ {valorFinal.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
          <button
            onClick={handleConfirmar}
            disabled={criarAgendamento.isPending || !aceito}
            className="w-full inline-flex items-center justify-center gap-2 mt-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-glow shadow-sm disabled:opacity-50"
          >
            {criarAgendamento.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Criando…</> : <>Confirmar e pagar <ArrowRight className="h-4 w-4" /></>}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full block text-center mt-2 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted">
            Voltar
          </button>
        </aside>
      </div>
    </AppShell>
  );
};

export default Confirmacao;
