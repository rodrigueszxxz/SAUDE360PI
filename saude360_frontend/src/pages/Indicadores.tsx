import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, StatCard, Chip } from "@/components/shared/PageHeader";
import { Activity, Heart, Droplet, Scale } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid } from "recharts";

const dataPA = [
  { d: "Jan", sis: 132, dia: 86 }, { d: "Fev", sis: 128, dia: 84 }, { d: "Mar", sis: 130, dia: 85 },
  { d: "Abr", sis: 124, dia: 80 }, { d: "Mai", sis: 122, dia: 78 }, { d: "Jun", sis: 118, dia: 76 },
];
const dataGli = [
  { d: "Sem 1", v: 112 }, { d: "Sem 2", v: 108 }, { d: "Sem 3", v: 115 },
  { d: "Sem 4", v: 110 }, { d: "Sem 5", v: 105 }, { d: "Sem 6", v: 102 },
];

const Indicadores = () => (
  <AppShell title="Indicadores de Saúde">
    <PageHeader eyebrow="Acompanhamento" title="Seus indicadores" description="Visualize tendências dos seus principais marcadores de saúde." />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard label="Pressão arterial" value="118/76" trend="↓ 4 mmHg" trendDirection="up" icon={<Heart className="h-5 w-5"/>} accent="success" />
      <StatCard label="Glicemia jejum" value="102" trend="↓ 10 mg/dL" trendDirection="up" icon={<Droplet className="h-5 w-5"/>} accent="info" />
      <StatCard label="Frequência cardíaca" value="72 bpm" trend="Estável" icon={<Activity className="h-5 w-5"/>} accent="primary" />
      <StatCard label="Peso" value="68,4 kg" trend="↓ 1,2 kg" trendDirection="up" icon={<Scale className="h-5 w-5"/>} accent="primary" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Pressão arterial</h3>
            <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
          </div>
          <Chip variant="success">Em controle</Chip>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={dataPA}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4}/>
            <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={12}/>
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12}/>
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}/>
            <Line type="monotone" dataKey="sis" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} name="Sistólica" />
            <Line type="monotone" dataKey="dia" stroke="hsl(var(--info))" strokeWidth={2.5} dot={{ r: 4 }} name="Diastólica" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Glicemia em jejum</h3>
            <p className="text-xs text-muted-foreground">Últimas 6 semanas</p>
          </div>
          <Chip variant="warning">Pré-diabetes</Chip>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={dataGli}>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4}/>
            <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={12}/>
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[80, 130]}/>
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}/>
            <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" fill="url(#g)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="card-elevated p-5 lg:col-span-2">
        <h3 className="font-semibold mb-4">Metas pessoais</h3>
        <div className="space-y-4">
          {[
            { label: "Reduzir peso para 65 kg", pct: 60 },
            { label: "30 min de caminhada diária", pct: 85 },
            { label: "Glicemia abaixo de 100 mg/dL", pct: 70 },
            { label: "Reduzir sódio na dieta", pct: 45 },
          ].map(m => (
            <div key={m.label}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-subtle-foreground">{m.label}</span>
                <span className="font-semibold">{m.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${m.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </AppShell>
);
export default Indicadores;
