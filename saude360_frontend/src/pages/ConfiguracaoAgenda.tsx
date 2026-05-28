import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { disponibilidadeApi } from "@/lib/api";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Clock, Plus, Trash2, Calendar, Loader2, Play } from "lucide-react";

const DIAS_SEMANA = [
  { val: 0, label: "Domingo" },
  { val: 1, label: "Segunda-feira" },
  { val: 2, label: "Terça-feira" },
  { val: 3, label: "Quarta-feira" },
  { val: 4, label: "Quinta-feira" },
  { val: 5, label: "Sexta-feira" },
  { val: 6, label: "Sábado" },
];

const ConfiguracaoAgenda = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Se for médico, pega o próprio ID (assumindo que o ID do usuário está atrelado. 
  // Na verdade precisamos do medico_id do DB. O hook do perfil ou o objeto user deve ter.)
  // Vamos supor que o user tem medico_id ou que a API do medico me diz. 
  // Como simplificação, e considerando que o backend exige o medico_id, 
  // se o front não tiver no context, podemos falhar silenciosamente ou buscar.
  const medicoId = user?.medico_id || user?.id; // Ajuste conforme seu auth state

  const [formConfig, setFormConfig] = useState({
    dia_semana: 1,
    hora_inicio: "08:00",
    hora_fim: "18:00",
    duracao_consulta_min: 30,
    modalidade: "AMBOS"
  });

  const { data: disponibilidades = [], isLoading } = useQuery({
    queryKey: ['disponibilidade', medicoId],
    queryFn: () => disponibilidadeApi.buscar(Number(medicoId)),
    enabled: !!medicoId
  });

  const salvarMutation = useMutation({
    mutationFn: (body: any) => disponibilidadeApi.salvar(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilidade', medicoId] });
      toast({ title: "Disponibilidade salva!" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" })
  });

  const removerMutation = useMutation({
    mutationFn: (id: number) => disponibilidadeApi.remover(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilidade', medicoId] });
      toast({ title: "Removido com sucesso" });
    }
  });

  const gerarSlotsMutation = useMutation({
    mutationFn: () => {
      const hoje = new Date();
      const daquiUmMes = new Date();
      daquiUmMes.setDate(daquiUmMes.getDate() + 30);
      
      const format = (d: Date) => d.toISOString().split('T')[0];
      
      return disponibilidadeApi.gerarSlots({
        medico_id: Number(medicoId),
        data_inicio: format(hoje),
        data_fim: format(daquiUmMes)
      });
    },
    onSuccess: (res: any) => {
      toast({ title: "Agenda gerada", description: res.mensagem });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao gerar slots", description: err.message, variant: "destructive" });
    }
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    salvarMutation.mutate({
      medico_id: medicoId,
      ...formConfig
    });
  };

  return (
    <AppShell title="Configuração da Agenda">
      <PageHeader
        eyebrow="Configurações"
        title="Disponibilidade Médica"
        description="Configure seus horários de atendimento recorrentes para que os pacientes possam agendar."
        actions={
          <button 
            onClick={() => gerarSlotsMutation.mutate()} 
            disabled={gerarSlotsMutation.isPending || disponibilidades.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow transition-colors disabled:opacity-50"
          >
            {gerarSlotsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Gerar 30 dias de Agenda
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de adição */}
        <aside className="lg:col-span-1">
          <form onSubmit={handleAdd} className="card-elevated p-6 sticky top-6">
            <h3 className="font-semibold mb-5 flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Novo Horário</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Dia da Semana</label>
                <select 
                  value={formConfig.dia_semana}
                  onChange={e => setFormConfig(p => ({ ...p, dia_semana: Number(e.target.value) }))}
                  className="w-full h-11 px-3 rounded-lg border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20"
                >
                  {DIAS_SEMANA.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Início</label>
                  <input 
                    type="time" 
                    value={formConfig.hora_inicio}
                    onChange={e => setFormConfig(p => ({ ...p, hora_inicio: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Fim</label>
                  <input 
                    type="time" 
                    value={formConfig.hora_fim}
                    onChange={e => setFormConfig(p => ({ ...p, hora_fim: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Duração (min)</label>
                <input 
                  type="number" step="5" min="5"
                  value={formConfig.duracao_consulta_min}
                  onChange={e => setFormConfig(p => ({ ...p, duracao_consulta_min: Number(e.target.value) }))}
                  className="w-full h-11 px-3 rounded-lg border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Modalidade</label>
                <select 
                  value={formConfig.modalidade}
                  onChange={e => setFormConfig(p => ({ ...p, modalidade: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20"
                >
                  <option value="AMBOS">Presencial e Online</option>
                  <option value="PRESENCIAL">Apenas Presencial</option>
                  <option value="TELECONSULTA">Apenas Teleconsulta</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={salvarMutation.isPending}
                className="w-full mt-2 h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary-glow disabled:opacity-50"
              >
                {salvarMutation.isPending ? "Salvando..." : <><Plus className="h-4 w-4" /> Adicionar</>}
              </button>
            </div>
          </form>
        </aside>

        {/* Lista de Configurações */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-elevated overflow-hidden">
            <div className="p-5 border-b border-border/50">
              <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Meus Horários Configurados</h3>
              <p className="text-sm text-muted-foreground mt-1">Esses horários são usados para gerar automaticamente os "slots" abertos para os pacientes.</p>
            </div>
            
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : disponibilidades.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Nenhuma disponibilidade cadastrada. Adicione ao lado.</div>
            ) : (
              <ul className="divide-y divide-border/50">
                {disponibilidades.map((d: any) => (
                  <li key={d.id} className="p-5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div>
                      <h4 className="font-semibold">{DIAS_SEMANA.find(ds => ds.val === d.dia_semana)?.label || "Dia " + d.dia_semana}</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Das {d.hora_inicio.substring(0, 5)} às {d.hora_fim.substring(0, 5)} · Consultas de {d.duracao_consulta_min} min
                      </p>
                      <div className="mt-2 text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full inline-block">
                        {d.modalidade}
                      </div>
                    </div>
                    <button 
                      onClick={() => removerMutation.mutate(d.id)}
                      className="h-9 w-9 flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remover horário"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default ConfiguracaoAgenda;
