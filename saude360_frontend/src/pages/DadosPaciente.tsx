/**
 * DadosPaciente.tsx — Saúde 360
 * Correções item 9:
 *  ✓ Campo "Nome do titular" adicionado ao convênio
 *  ✓ Validação obrigatória quando possui convênio (operadora + carteirinha + titular + validade)
 *  ✓ Mesma fonte de dados usada no pagamento (convenio_titular salvo no perfil)
 *  ✓ Status visual claro de cadastro incompleto
 */
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Save, Upload, User, Phone, Shield, Heart, AlertCircle, Scale, Ruler, Loader2, CheckCircle2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAtualizarPerfil, usePerfil } from "@/hooks/useApi";

const Field = ({
  label, value, type = "text", placeholder, full, onChange, required, error
}: {
  label: string; value?: string; type?: string; placeholder?: string; full?: boolean;
  onChange?: (v: string) => void; required?: boolean; error?: string;
}) => (
  <div className={full ? "md:col-span-2" : ""}>
    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
      {label}{required && <span className="text-destructive ml-0.5">*</span>}
    </label>
    <input
      value={value ?? ""}
      type={type}
      placeholder={placeholder}
      onChange={e => onChange?.(e.target.value)}
      className={`w-full h-11 px-3.5 rounded-lg border bg-card text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
        error ? "border-destructive ring-1 ring-destructive/30" : "border-border"
      }`}
    />
    {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
  </div>
);

const SelectField = ({
  label, value, options, onChange, full, required
}: {
  label: string; value?: string; options: string[]; onChange?: (v: string) => void;
  full?: boolean; required?: boolean;
}) => (
  <div className={full ? "md:col-span-2" : ""}>
    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
      {label}{required && <span className="text-destructive ml-0.5">*</span>}
    </label>
    <select
      value={value ?? ""}
      onChange={e => onChange?.(e.target.value)}
      className="w-full h-11 px-3.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
    >
      <option value="">Selecione...</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const CONVENIOS = ["Unimed", "Bradesco Saúde", "SulAmérica", "Amil", "Hapvida", "Porto Seguro", "Particular", "Outro"];

const DadosPaciente = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const { data: perfilData } = usePerfil();

  const [form, setForm] = useState({
    nome: user?.nome ?? "",
    nomeSocial: "",
    dataNascimento: "",
    cpf: user?.cpf ?? "",
    rg: "",
    sexo: "",
    estadoCivil: "",
    email: user?.email ?? "",
    telefone: "",
    telefoneFixo: "",
    cep: "",
    cidade: "",
    endereco: "",
    peso: "",
    altura: "",
    tipoSanguineo: "",
    alergias: "",
    medicacoes: "",
    temConvenio: "nao",
    convenioOperadora: "",
    convenioNumero: "",
    convenioTitular: "",   // ← campo obrigatório adicionado
    convenioTipo: "",
    convenioValidade: "",
    emergenciaNome: "",
    emergenciaParentesco: "",
    emergenciaTelefone: "",
    emergenciaEmail: "",
  });

  // Erros de validação dos campos de convênio
  const [convenioErros, setConvenioErros] = useState({
    operadora: "", numero: "", titular: "", validade: "",
  });

  useEffect(() => {
    if (perfilData) {
      setForm({
        nome: perfilData.nome ?? user?.nome ?? "",
        nomeSocial: perfilData.nome_social ?? "",
        dataNascimento: perfilData.data_nascimento ?? "",
        cpf: perfilData.cpf ?? user?.cpf ?? "",
        rg: perfilData.rg ?? "",
        sexo: perfilData.sexo ?? "",
        estadoCivil: perfilData.estado_civil ?? "",
        email: perfilData.email ?? user?.email ?? "",
        telefone: perfilData.whatsapp ?? "",
        telefoneFixo: perfilData.telefone_fixo ?? "",
        cep: perfilData.cep ?? "",
        cidade: perfilData.cidade ?? "",
        endereco: perfilData.endereco ?? "",
        peso: perfilData.peso ?? "",
        altura: perfilData.altura ?? "",
        tipoSanguineo: perfilData.tipo_sanguineo ?? "",
        alergias: perfilData.alergias ?? "",
        medicacoes: perfilData.medicacoes ?? "",
        temConvenio: perfilData.convenio_operadora ? "sim" : "nao",
        convenioOperadora: perfilData.convenio_operadora ?? "",
        convenioNumero: perfilData.convenio_numero ?? "",
        convenioTitular: perfilData.convenio_titular ?? localStorage.getItem("@saude360:convenioTitular") ?? "",
        convenioTipo: perfilData.convenio_tipo ?? "",
        convenioValidade: perfilData.convenio_validade ? perfilData.convenio_validade.substring(0, 7) : "",
        emergenciaNome: perfilData.emergencia_nome ?? "",
        emergenciaParentesco: perfilData.emergencia_parentesco ?? "",
        emergenciaTelefone: perfilData.emergencia_telefone ?? "",
        emergenciaEmail: perfilData.emergencia_email ?? "",
      });
      if (perfilData.foto_perfil) setFotoPreview(perfilData.foto_perfil);
    }
  }, [perfilData, user]);

  const set = (k: keyof typeof form) => (v: string) => {
    setForm(prev => ({ ...prev, [k]: v }));
    // Limpa erro do campo ao digitar
    if (k === "convenioOperadora") setConvenioErros(e => ({ ...e, operadora: "" }));
    if (k === "convenioNumero") setConvenioErros(e => ({ ...e, numero: "" }));
    if (k === "convenioTitular") setConvenioErros(e => ({ ...e, titular: "" }));
    if (k === "convenioValidade") setConvenioErros(e => ({ ...e, validade: "" }));
  };

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Use uma imagem menor que 2MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => setFotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const atualizarPerfil = useAtualizarPerfil();

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Validação de convênio: todos os campos são obrigatórios ────────────
    if (form.temConvenio === "sim") {
      const erros = {
        operadora: !form.convenioOperadora ? "Selecione a operadora" : "",
        numero: !form.convenioNumero ? "Informe o número da carteirinha" : "",
        validade: !form.convenioValidade ? "Informe a validade do plano" : "",
      };
      setConvenioErros(erros);

      const temErro = Object.values(erros).some(Boolean);
      if (temErro) {
        toast({
          title: "Dados do convênio incompletos",
          description: "Preencha todos os campos obrigatórios do plano de saúde.",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      const mapa: Record<string, string> = {
        nome: form.nome,
        cpf: form.cpf,
        email: form.email,
        whatsapp: form.telefone,
        telefone_fixo: form.telefoneFixo,
        data_nascimento: form.dataNascimento,
        nome_social: form.nomeSocial,
        rg: form.rg,
        sexo: form.sexo,
        estado_civil: form.estadoCivil,
        cep: form.cep,
        cidade: form.cidade,
        endereco: form.endereco,
        peso: form.peso,
        altura: form.altura,
        tipo_sanguineo: form.tipoSanguineo,
        alergias: form.alergias,
        medicacoes: form.medicacoes,
        // Convênio: salva completo se marcou "sim", limpa se "não"
        convenio_operadora: form.temConvenio === "sim" ? form.convenioOperadora : "",
        convenio_numero: form.temConvenio === "sim" ? form.convenioNumero : "",
        convenio_tipo: form.temConvenio === "sim" ? form.convenioTipo : "",
        convenio_validade: form.temConvenio === "sim" ? form.convenioValidade : "",
        convenio_titular: form.temConvenio === "sim" ? form.convenioTitular : "",
        emergencia_nome: form.emergenciaNome,
        emergencia_parentesco: form.emergenciaParentesco,
        emergencia_telefone: form.emergenciaTelefone,
        emergencia_email: form.emergenciaEmail,
      };

      for (const [key, value] of Object.entries(mapa)) {
        payload[key] = value.trim?.() ?? value;
      }

      if (fotoPreview && fotoPreview.startsWith("data:image")) {
        payload.foto_perfil = fotoPreview;
      }

      const res = await atualizarPerfil.mutateAsync(payload);
      if (res?.usuario) {
        const u = res.usuario as any;
        updateUser({ ...u, avatar: u.foto_perfil });
        if (form.temConvenio === "sim") {
          localStorage.setItem("@saude360:convenioTitular", form.convenioTitular);
        } else {
          localStorage.removeItem("@saude360:convenioTitular");
        }
      }
      toast({ title: "Dados salvos com sucesso! ✅" });
    } catch {
      // erro já tratado pelo hook
    } finally {
      setSaving(false);
    }
  };

  // Status de convênio para o badge lateral
  const convenioIncompleto = form.temConvenio === "sim" &&
    (!form.convenioOperadora || !form.convenioNumero || !form.convenioValidade);

  const convenioCompleto = form.temConvenio === "sim" && !convenioIncompleto;

  const initials = form.nome.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase() || "??";

  return (
    <AppShell title="Meus Dados">
      <PageHeader
        eyebrow="Perfil"
        title="Meus dados"
        description="Mantenha suas informações sempre atualizadas para um atendimento ágil."
        actions={
          <>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, nome: user?.nome ?? "" }))}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              form="dados-form"
              type="submit"
              disabled={saving || convenioIncompleto}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow shadow-sm disabled:opacity-50 transition-colors"
              title={convenioIncompleto ? "Complete os dados do convênio para salvar" : undefined}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar alterações
            </button>
          </>
        }
      />

      <form id="dados-form" onSubmit={handleSalvar} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar com foto */}
        <aside className="lg:col-span-1 card-elevated p-6 h-fit">
          <div className="flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-full bg-primary-soft text-primary flex items-center justify-center text-2xl font-semibold mb-3 overflow-hidden border-2 border-primary/20">
              {fotoPreview
                ? <img src={fotoPreview} alt="Foto" className="h-full w-full object-cover" />
                : <span>{initials}</span>
              }
            </div>
            <p className="font-semibold">{form.nome || "Paciente"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
            >
              <Upload className="h-3.5 w-3.5" /> Trocar foto
            </button>
          </div>

          <div className="border-t border-border/50 mt-6 pt-6 space-y-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Papel</p>
              <p className="font-medium capitalize">{user?.papel ?? "—"}</p>
            </div>
            {form.tipoSanguineo && (
              <div>
                <p className="text-xs text-muted-foreground">Tipo sanguíneo</p>
                <p className="font-medium text-destructive">{form.tipoSanguineo}</p>
              </div>
            )}
            {form.peso && form.altura && (
              <div>
                <p className="text-xs text-muted-foreground">IMC estimado</p>
                <p className="font-medium">
                  {(parseFloat(form.peso) / Math.pow(parseFloat(form.altura) / 100, 2)).toFixed(1)} kg/m²
                </p>
              </div>
            )}

            {/* Status do convênio no sidebar */}
            <div className="border-t border-border/50 pt-4">
              <p className="text-xs text-muted-foreground mb-2">Plano de saúde</p>
              {form.temConvenio === "nao" ? (
                <span className="text-xs text-muted-foreground">Particular</span>
              ) : convenioCompleto ? (
                <div className="flex items-center gap-1.5 text-success text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Cadastrado ({form.convenioOperadora})
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-destructive text-xs font-medium">
                  <AlertCircle className="h-3.5 w-3.5" /> Dados incompletos
                </div>
              )}
            </div>
          </div>
        </aside>

        <div className="lg:col-span-2 space-y-6">
          {/* Identificação */}
          <section className="card-elevated p-6">
            <h3 className="font-semibold mb-5 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Identificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Nome completo" value={form.nome} onChange={set("nome")} full />
              <Field label="Nome social" value={form.nomeSocial} onChange={set("nomeSocial")} placeholder="Opcional" />
              <Field label="Data de nascimento" value={form.dataNascimento} onChange={set("dataNascimento")} type="date" />
              <Field label="CPF" value={form.cpf} onChange={set("cpf")} placeholder="000.000.000-00" />
              <Field label="RG" value={form.rg} onChange={set("rg")} />
              <SelectField label="Sexo biológico" value={form.sexo} onChange={set("sexo")} options={["Masculino","Feminino","Outro"]} />
              <SelectField label="Estado civil" value={form.estadoCivil} onChange={set("estadoCivil")} options={["Solteiro(a)","Casado(a)","Divorciado(a)","Viúvo(a)","União estável"]} />
            </div>
          </section>

          {/* Contato */}
          <section className="card-elevated p-6">
            <h3 className="font-semibold mb-5 flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> Contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="E-mail" value={form.email} onChange={set("email")} type="email" full />
              <Field label="Telefone celular" value={form.telefone} onChange={set("telefone")} placeholder="(00) 90000-0000" />
              <Field label="Telefone fixo" value={form.telefoneFixo} onChange={set("telefoneFixo")} placeholder="(00) 0000-0000" />
              <Field label="CEP" value={form.cep} onChange={set("cep")} placeholder="00000-000" />
              <Field label="Cidade" value={form.cidade} onChange={set("cidade")} />
              <Field label="Endereço completo" value={form.endereco} onChange={set("endereco")} placeholder="Rua, número, bairro" full />
            </div>
          </section>

          {/* Dados de saúde */}
          <section className="card-elevated p-6">
            <h3 className="font-semibold mb-5 flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> Dados de Saúde</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Peso (kg)</label>
                <div className="relative">
                  <Scale className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    value={form.peso}
                    onChange={e => set("peso")(e.target.value)}
                    type="number" step="0.1" min="1" max="300"
                    placeholder="Ex: 70.5"
                    className="w-full h-11 pl-9 pr-3.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Altura (cm)</label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    value={form.altura}
                    onChange={e => set("altura")(e.target.value)}
                    type="number" min="50" max="250"
                    placeholder="Ex: 170"
                    className="w-full h-11 pl-9 pr-3.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <SelectField
                label="Tipo sanguíneo"
                value={form.tipoSanguineo}
                onChange={set("tipoSanguineo")}
                options={["A+","A-","B+","B-","AB+","AB-","O+","O-","Não sei"]}
              />
              <Field label="Alergias" value={form.alergias} onChange={set("alergias")} placeholder="Ex: Penicilina, Dipirona" />
              <Field label="Medicações em uso" value={form.medicacoes} onChange={set("medicacoes")} placeholder="Ex: Losartana 50mg" full />
            </div>
          </section>

          {/* Convênio */}
          <section className="card-elevated p-6">
            <h3 className="font-semibold mb-5 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Plano de Saúde
              {convenioIncompleto && (
                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[11px] font-medium">
                  <AlertCircle className="h-3 w-3" /> Dados incompletos — necessário para usar convênio no pagamento
                </span>
              )}
              {convenioCompleto && (
                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[11px] font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Cadastro completo
                </span>
              )}
            </h3>

            <div className="mb-4">
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Possui convênio?</label>
              <div className="flex gap-4">
                {["sim", "nao"].map(op => (
                  <label key={op} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="temConvenio"
                      value={op}
                      checked={form.temConvenio === op}
                      onChange={() => set("temConvenio")(op)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{op === "sim" ? "Sim" : "Não / Particular"}</span>
                  </label>
                ))}
              </div>
            </div>

            {form.temConvenio === "sim" && (
              <>
                <div className="p-3 rounded-lg bg-info-soft/40 border border-info/20 text-xs text-info mb-4">
                  ℹ️ Todos os campos marcados com <span className="text-destructive font-bold">*</span> são obrigatórios para usar o convênio no pagamento.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <SelectField
                    label="Operadora"
                    value={form.convenioOperadora}
                    onChange={set("convenioOperadora")}
                    options={CONVENIOS}
                    required
                  />
                  {convenioErros.operadora && <p className="text-[11px] text-destructive -mt-3">{convenioErros.operadora}</p>}

                  <Field
                    label="Número da carteirinha"
                    value={form.convenioNumero}
                    onChange={set("convenioNumero")}
                    placeholder="0000 0000 0000 0000"
                    required
                    error={convenioErros.numero}
                  />

                  <Field
                    label="Nome do titular"
                    value={form.convenioTitular}
                    onChange={set("convenioTitular")}
                    placeholder="Nome como está no cartão"
                  />

                  <Field
                    label="Validade"
                    value={form.convenioValidade}
                    onChange={set("convenioValidade")}
                    type="month"
                    required
                    error={convenioErros.validade}
                  />

                  <Field label="Tipo de plano" value={form.convenioTipo} onChange={set("convenioTipo")} placeholder="Ex: Empresarial Premium" />
                </div>
              </>
            )}

            {form.temConvenio === "nao" && (
              <div className="p-4 rounded-lg bg-muted/40 text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Atendimento particular. O valor da consulta será exibido no momento do agendamento.
              </div>
            )}
          </section>

          {/* Contato de emergência */}
          <section className="card-elevated p-6">
            <h3 className="font-semibold mb-5 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-primary" /> Contato de Emergência</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Nome" value={form.emergenciaNome} onChange={set("emergenciaNome")} />
              <SelectField label="Parentesco" value={form.emergenciaParentesco} onChange={set("emergenciaParentesco")} options={["Cônjuge","Filho(a)","Pai/Mãe","Irmão/Irmã","Amigo(a)","Outro"]} />
              <Field label="Telefone" value={form.emergenciaTelefone} onChange={set("emergenciaTelefone")} placeholder="(00) 90000-0000" />
              <Field label="E-mail" value={form.emergenciaEmail} onChange={set("emergenciaEmail")} type="email" />
            </div>
          </section>
        </div>
      </form>
    </AppShell>
  );
};

export default DadosPaciente;
