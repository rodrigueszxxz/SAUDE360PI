import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Chip } from "@/components/shared/PageHeader";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Video, MapPin, Star, Calendar } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

const dias = [
  { d: "Seg", n: "10", slots: ["09:00", "09:30", "10:30", "14:00", "15:30", "16:00"] },
  { d: "Ter", n: "11", slots: ["08:00", "08:30", "11:00", "13:30", "14:30"] },
  { d: "Qua", n: "12", slots: ["09:00", "10:00", "10:30", "15:00", "16:30", "17:00"] },
  { d: "Qui", n: "13", slots: ["08:30", "09:00", "11:30", "14:00", "15:00"] },
  { d: "Sex", n: "14", slots: ["08:00", "09:30", "10:00", "13:30", "14:30", "16:00"] },
  { d: "Sáb", n: "15", slots: ["09:00", "10:00", "11:00"] },
];

const GradeHorarios = () => {
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState<string | null>("Seg-09:30");

  const medicoNome = searchParams.get("medico_nome") ?? "Médico";
  const especialidade = searchParams.get("especialidade") ?? "";
  const medicoCRM = searchParams.get("medico_crm") ?? "";
  const tiposConsultaParam = searchParams.get("tipos_consulta") ?? "PRESENCIAL";
  const tiposConsulta = tiposConsultaParam.split(",").map(t => t.trim());

  // Constrói a URL para a confirmação repassando todos os parâmetros relevantes
  const buildConfirmacaoUrl = () => {
    const base = new URLSearchParams(searchParams);
    base.set("slot_id", selected ?? "");
    return `/paciente/confirmacao?${base.toString()}`;
  };

  return (
    <AppShell title="Grade de Horários">
      <PageHeader
        eyebrow="Passo 2 de 4"
        title="Escolha um horário"
        description={`Disponibilidade dos próximos 7 dias para ${medicoNome}.`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <aside className="card-elevated p-5 h-fit">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-soft to-secondary text-primary flex items-center justify-center font-semibold text-lg">
              {medicoNome.split(" ").slice(-2).map(n => n[0]).join("")}
            </div>
            <div>
              <h3 className="font-semibold">{medicoNome}</h3>
              <p className="text-xs text-muted-foreground">{especialidade}{medicoCRM && ` · CRM ${medicoCRM}`}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                <span className="text-xs font-semibold">4.9</span>
                <span className="text-[10px] text-muted-foreground">(312)</span>
              </div>
            </div>
          </div>
          <div className="border-t border-border/50 pt-4 space-y-3 text-sm">
            {tiposConsulta.includes("PRESENCIAL") && (
              <div className="flex items-center gap-2 text-subtle-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Presencial disponível
              </div>
            )}
            {tiposConsulta.includes("TELECONSULTA") && (
              <div className="flex items-center gap-2 text-subtle-foreground">
                <Video className="h-4 w-4 text-primary" />
                <span className="text-primary font-medium">Teleconsulta disponível</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-subtle-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground" /> Próximos 7 dias
            </div>
          </div>
          <div className="border-t border-border/50 mt-4 pt-4">
            <p className="text-xs text-muted-foreground">Valor consulta</p>
            <p className="text-2xl font-semibold">R$ 60,00</p>
          </div>
        </aside>

        <section>
          <div className="card-elevated p-5 mb-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold">Disponibilidade</h3>
              <div className="inline-flex items-center rounded-lg border border-border overflow-hidden">
                <button className="h-9 w-9 inline-flex items-center justify-center hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
                <button className="h-9 w-9 inline-flex items-center justify-center hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {dias.map(d => (
                <div key={d.n} className="space-y-2">
                  <div className="text-center p-2.5 rounded-xl bg-muted/40 border border-border/40">
                    <p className="text-xs uppercase text-muted-foreground tracking-wider">{d.d}</p>
                    <p className="text-xl font-semibold">{d.n}</p>
                    <p className="text-[10px] text-success font-medium mt-0.5">{d.slots.length} horários</p>
                  </div>
                  <div className="space-y-1.5">
                    {d.slots.map(s => {
                      const id = `${d.d}-${s}`;
                      const isSel = selected === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setSelected(id)}
                          className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
                            isSel
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-card border border-border hover:border-primary/40 hover:bg-primary-soft/40 text-subtle-foreground"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-elevated p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Horário selecionado</p>
              <p className="font-semibold text-lg">
                {selected ? `${selected.split("-")[0]} 10 jun · ${selected.split("-")[1]}` : "Nenhum"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/busca-medicos" className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted">Voltar</Link>
              <Link to={buildConfirmacaoUrl()} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow shadow-sm">
                Continuar →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export default GradeHorarios;

