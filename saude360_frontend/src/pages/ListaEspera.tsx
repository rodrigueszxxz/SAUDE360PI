import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Chip } from "@/components/shared/PageHeader";
import { ListChecks, Phone, MessageSquare, ArrowRight, AlertCircle } from "lucide-react";



import { useAdminListaEspera, useAdminConfirmarEncaixe, useAdminPularFila } from "@/hooks/useApi";
import { Loader2 } from "lucide-react";

const ListaEspera = () => {
  const { data: filaEspera = [], isLoading } = useAdminListaEspera();
  const encaixar = useAdminConfirmarEncaixe();
  const pular = useAdminPularFila();
  
  const proximo = filaEspera.length > 0 ? filaEspera[0] : null;
  return (
    <AppShell title="Lista de Espera">
      <PageHeader
        eyebrow="Encaixes inteligentes"
        title="Lista de espera"
        description={`${filaEspera.length} pacientes aguardando vaga. A IA sugere encaixes ao surgir disponibilidade.`}
      />

      {proximo && (
        <div className="card-elevated p-5 border-l-4 border-l-info mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-info mt-0.5" />
          <div>
            <p className="font-semibold">Oportunidade de encaixe</p>
            <p className="text-sm text-muted-foreground mt-1">
              {proximo.nome} é a próxima sugestão (aguardando desde {new Date(proximo.criado_em).toLocaleDateString()}). Confirmar encaixe?
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => encaixar.mutate(proximo.id)}
                disabled={encaixar.isPending}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-glow disabled:opacity-50"
              >
                {encaixar.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar encaixe"}
              </button>
              <button
                onClick={() => pular.mutate(proximo.id)}
                disabled={pular.isPending}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                {pular.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Próximo da fila"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-medium">#</th>
                <th className="text-left px-5 py-3 font-medium">Paciente</th>
                <th className="text-left px-5 py-3 font-medium">Especialidade</th>
                <th className="text-left px-5 py-3 font-medium">Aguardando</th>
                <th className="text-left px-5 py-3 font-medium">Prioridade</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : filaEspera.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Fila de espera vazia.</td></tr>
              ) : filaEspera.map((p: any, idx: number) => {
                const diffDays = Math.floor((new Date().getTime() - new Date(p.criado_em).getTime()) / (1000 * 3600 * 24));
                const prio = diffDays > 3 ? "Alta" : diffDays > 1 ? "Média" : "Baixa";
                const variant = diffDays > 3 ? "destructive" : diffDays > 1 ? "warning" : "muted";
                
                return (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{(idx + 1).toString().padStart(2, "0")}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.whatsapp || "Sem telefone"}</p>
                  </td>
                  <td className="px-5 py-3 text-subtle-foreground">{p.medicos?.especialidade || "Não especificada"}</td>
                  <td className="px-5 py-3 text-subtle-foreground">{diffDays === 0 ? "Hoje" : `${diffDays} dia(s)`}</td>
                  <td className="px-5 py-3"><Chip variant={variant}>{prio}</Chip></td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button className="h-8 w-8 rounded-lg hover:bg-muted inline-flex items-center justify-center text-muted-foreground" title="Ligar"><Phone className="h-4 w-4" /></button>
                      <button className="h-8 w-8 rounded-lg hover:bg-muted inline-flex items-center justify-center text-muted-foreground" title="WhatsApp"><MessageSquare className="h-4 w-4" /></button>
                      <button onClick={() => encaixar.mutate(p.id)} disabled={encaixar.isPending} className="px-2.5 h-8 rounded-lg bg-primary-soft text-primary text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors inline-flex items-center gap-1 disabled:opacity-50">Encaixar <ArrowRight className="h-3 w-3" /></button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
};

export default ListaEspera;
