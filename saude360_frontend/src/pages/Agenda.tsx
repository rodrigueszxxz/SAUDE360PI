import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Chip } from "@/components/shared/PageHeader";
import { ChevronLeft, ChevronRight, Plus, Filter, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { useAgendamentosHoje } from "@/hooks/useApi";

const horarios = [
  "07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30",
  "15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30",
  "19:00","19:30"
];

const corMap = {
  primary: "bg-primary-soft text-primary border-primary/30",
  info: "bg-info-soft text-info border-info/30",
  warning: "bg-warning-soft text-warning border-warning/30",
  success: "bg-success-soft text-success border-success/30",
};

const Agenda = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { startOfWeek, endOfWeek, dias, monthYear } = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // ajusta pra Segunda
    start.setDate(diff);
    start.setHours(0,0,0,0);
    
    const end = new Date(start);
    end.setDate(end.getDate() + 5); // até Sábado
    end.setHours(23,59,59,999);

    const ds = [];
    for(let i=0; i<6; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const map = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      ds.push({ id: d.toISOString().split('T')[0], label: `${map[d.getDay()]} ${d.getDate().toString().padStart(2, '0')}` });
    }

    return { 
      startOfWeek: start.toISOString().split('T')[0], 
      endOfWeek: end.toISOString().split('T')[0],
      dias: ds,
      monthYear: start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    };
  }, [currentDate]);

  const { data: agendamentos = [], isLoading } = useAgendamentosHoje({ data_inicio: startOfWeek, data_fim: endOfWeek });

  const eventosMap = useMemo(() => {
    const map: Record<string, any> = {};
    agendamentos.forEach(a => {
      if (a.data_consulta && a.horario) {
        const hora = a.horario.substring(0, 5); // "09:00"
        const key = `${a.data_consulta}-${hora}`;
        let cor = "primary";
        if (a.tipo_consulta === "TELECONSULTA") cor = "info";
        else if (a.tipo_consulta === "PRIMEIRA_CONSULTA") cor = "warning";
        if (a.status === "CANCELADO") cor = "destructive";
        
        map[key] = {
           paciente: a.pacientes?.nome || a.nome || "Paciente",
           tipo: a.tipo_consulta === "PRIMEIRA_CONSULTA" ? "Primeira" : a.tipo_consulta === "TELECONSULTA" ? "Tele" : "Retorno",
           cor: cor,
        };
      }
    });
    return map;
  }, [agendamentos]);

  const prevWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); };
  const nextWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); };

  return (
    <AppShell title="Agenda da Clínica">
      <PageHeader
        eyebrow="Visão Semanal"
        title={`${dias[0].label.split(" ")[1]} a ${dias[5].label.split(" ")[1]} de ${monthYear}`}
        description="Seus agendamentos para esta semana."
        actions={
          <>
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"><Filter className="h-4 w-4"/> Filtros</button>
            <div className="inline-flex items-center rounded-lg border border-border overflow-hidden">
              <button onClick={prevWeek} className="h-9 w-9 inline-flex items-center justify-center hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
              <span className="px-3 text-sm font-medium border-x border-border">Semana</span>
              <button onClick={nextWeek} className="h-9 w-9 inline-flex items-center justify-center hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <Link to="/medico/agenda/configuracao" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Configurar</Link>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow shadow-sm"><Plus className="h-4 w-4" /> Novo agendamento</button>
          </>
        }
      />

      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[80px_repeat(6,1fr)] border-b border-border/60 bg-muted/40">
              <div></div>
              {dias.map(d => (
                <div key={d.id} className="px-4 py-3 text-center border-l border-border/40">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{d.label.split(" ")[0]}</p>
                  <p className="text-lg font-semibold mt-0.5">{d.label.split(" ")[1]}</p>
                </div>
              ))}
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              horarios.map(h => (
                <div key={h} className="grid grid-cols-[80px_repeat(6,1fr)] border-b border-border/40 last:border-b-0">
                  <div className="px-3 py-4 text-xs text-muted-foreground font-medium border-r border-border/40">{h}</div>
                  {dias.map(d => {
                    const ev = eventosMap[`${d.id}-${h}`];
                    return (
                      <div key={`${d.id}-${h}`} className="border-l border-border/40 p-1.5 min-h-[64px]">
                        {ev ? (
                          <div className={`h-full rounded-lg border-l-4 ${corMap[ev.cor as keyof typeof corMap] || corMap.primary} p-2 cursor-pointer hover:shadow-sm transition-shadow`}>
                            <p className="text-xs font-semibold truncate">{ev.paciente}</p>
                            <p className="text-[10px] opacity-80 mt-0.5">{ev.tipo}</p>
                          </div>
                        ) : (
                          <button className="h-full w-full rounded-lg border border-dashed border-border/60 text-muted-foreground hover:border-primary/40 hover:bg-primary-soft/40 transition-all opacity-0 hover:opacity-100">
                            <Plus className="h-4 w-4 mx-auto" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 px-5 py-3 border-t border-border/60 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Retorno</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-info" /> Teleconsulta</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-warning" /> Primeira / Avaliação</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-success" /> Bloqueio / Plantão</span>
        </div>
      </div>
    </AppShell>
  );
};

export default Agenda;
