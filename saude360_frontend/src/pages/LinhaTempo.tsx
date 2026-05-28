import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Chip } from "@/components/shared/PageHeader";
import { Stethoscope, FileText, Pill, Activity, Syringe, Heart, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { meuAgendamentosApi, Agendamento } from "@/lib/api";

// Mapeia status para variante visual
function chipVariant(status: string): "primary" | "success" | "warning" | "info" | "muted" {
  if (status === "CONCLUIDO") return "success";
  if (status === "CANCELADO") return "muted";
  if (status === "PENDENTE_PAGAMENTO") return "warning";
  return "primary";
}

function chipLabel(status: string) {
  const m: Record<string, string> = {
    CONCLUIDO: "Realizada",
    CANCELADO: "Cancelada",
    CONFIRMADO: "Confirmada",
    PENDENTE_PAGAMENTO: "Pend. pagamento",
    AGUARDANDO: "Aguardando",
    EM_ATENDIMENTO: "Em atendimento",
    NO_SHOW: "Não compareceu",
  };
  return m[status] ?? status;
}

function agruparPorAno(agendamentos: Agendamento[]) {
  const grupos: Record<string, Agendamento[]> = {};
  for (const a of agendamentos) {
    const ano = a.data_consulta?.slice(0, 4) ?? "Sem data";
    if (!grupos[ano]) grupos[ano] = [];
    grupos[ano].push(a);
  }
  // Ordena anos decrescente
  return Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0]));
}

function formatarData(d?: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const LinhaTempo = () => {
  const { user } = useAuth();

  const { data: agendamentos = [], isLoading, isError } = useQuery({
    queryKey: ["meus-agendamentos"],
    queryFn: meuAgendamentosApi.listar,
    enabled: !!user,
  });

  const grupos = agruparPorAno(agendamentos);

  return (
    <AppShell title="Linha do Tempo de Saúde">
      <PageHeader
        eyebrow="Sua jornada"
        title="Linha do tempo"
        description="Todos os seus eventos clínicos em ordem cronológica."
      />

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 mb-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">Erro ao carregar histórico. Verifique sua conexão.</p>
        </div>
      )}

      {!isLoading && agendamentos.length === 0 && !isError && (
        <div className="text-center py-16">
          <Stethoscope className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum evento clínico encontrado.</p>
          <p className="text-sm text-muted-foreground mt-1">Seus agendamentos aparecerão aqui.</p>
        </div>
      )}

      {!isLoading && grupos.length > 0 && (
        <div className="space-y-10">
          {grupos.map(([ano, items]) => (
            <div key={ano}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-5">{ano}</h3>
              <ol className="relative border-l-2 border-border/60 ml-4 space-y-6">
                {items.map(a => (
                  <li key={a.id} className="relative pl-8">
                    <div className="absolute -left-[19px] top-1 h-9 w-9 rounded-full bg-card border-2 border-border flex items-center justify-center">
                      <Stethoscope className="h-4 w-4 text-primary" />
                    </div>
                    <div className="card-elevated p-5">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                        <p className="text-xs text-muted-foreground font-medium">
                          {formatarData(a.data_consulta)}{a.horario ? ` · ${String(a.horario).slice(0,5)}` : ""}
                        </p>
                        <Chip variant={chipVariant(a.status)}>{chipLabel(a.status)}</Chip>
                      </div>
                      <p className="font-semibold">{a.medicos?.nome ?? "Médico não informado"}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {a.medicos?.especialidade ?? "Especialidade não informada"}
                        {a.tipo_consulta === "TELECONSULTA" ? " · Teleconsulta" : ""}
                        {a.protocolo ? ` · #${a.protocolo}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
};

export default LinhaTempo;
