import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Chip } from "@/components/shared/PageHeader";
import { ListChecks, Phone, MessageSquare, ArrowRight, AlertCircle } from "lucide-react";

const espera = [
  { n: 1, paciente: "Helena Castro", tel: "(11) 98800-1234", esp: "Cardiologia", desde: "5 dias", prio: "Alta", variant: "destructive" as const },
  { n: 2, paciente: "Pedro Almeida", tel: "(11) 98800-5566", esp: "Cardiologia", desde: "3 dias", prio: "Média", variant: "warning" as const },
  { n: 3, paciente: "Sofia Oliveira", tel: "(11) 98800-7788", esp: "Cardiologia", desde: "2 dias", prio: "Média", variant: "warning" as const },
  { n: 4, paciente: "Tiago Mendes", tel: "(11) 98800-3344", esp: "Cardiologia", desde: "1 dia", prio: "Baixa", variant: "muted" as const },
  { n: 5, paciente: "Camila Reis", tel: "(11) 98800-9911", esp: "Cardiologia", desde: "1 dia", prio: "Baixa", variant: "muted" as const },
];

const ListaEspera = () => {
  return (
    <AppShell title="Lista de Espera">
      <PageHeader
        eyebrow="Encaixes inteligentes"
        title="Lista de espera"
        description="14 pacientes aguardando vaga. A IA sugere encaixes ao surgir disponibilidade."
        actions={<button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow">+ Adicionar</button>}
      />

      <div className="card-elevated p-5 border-l-4 border-l-info mb-6 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-info mt-0.5" />
        <div>
          <p className="font-semibold">Vaga liberada às 15:00 hoje</p>
          <p className="text-sm text-muted-foreground mt-1">Helena Castro (prioridade alta) é a próxima sugestão. Confirmar encaixe?</p>
          <div className="flex gap-2 mt-3">
            <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-glow">Confirmar encaixe</button>
            <button className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted">Próximo da fila</button>
          </div>
        </div>
      </div>

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
              {espera.map(p => (
                <tr key={p.n} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{p.n.toString().padStart(2, "0")}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium">{p.paciente}</p>
                    <p className="text-xs text-muted-foreground">{p.tel}</p>
                  </td>
                  <td className="px-5 py-3 text-subtle-foreground">{p.esp}</td>
                  <td className="px-5 py-3 text-subtle-foreground">{p.desde}</td>
                  <td className="px-5 py-3"><Chip variant={p.variant}>{p.prio}</Chip></td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button className="h-8 w-8 rounded-lg hover:bg-muted inline-flex items-center justify-center text-muted-foreground"><Phone className="h-4 w-4" /></button>
                      <button className="h-8 w-8 rounded-lg hover:bg-muted inline-flex items-center justify-center text-muted-foreground"><MessageSquare className="h-4 w-4" /></button>
                      <button className="px-2.5 h-8 rounded-lg bg-primary-soft text-primary text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors inline-flex items-center gap-1">Encaixar <ArrowRight className="h-3 w-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
};

export default ListaEspera;
