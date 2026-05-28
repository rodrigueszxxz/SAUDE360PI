/**
 * BuscaMedicos.tsx — Saúde 360
 * Estrutura visual inspirada no AgendaCendap:
 *  - Hero com barra de busca proeminente
 *  - Scroll horizontal de especialidades (chips clicáveis)
 *  - Cards horizontais de médico (avatar + info + botão agendar)
 *  - Filtros de convênio como pills
 *  - Bottom Nav em mobile
 */
import { useState, useMemo } from "react";
import { PublicShell } from "@/components/layout/PublicShell";
import { AppShell } from "@/components/layout/AppShell";
import { Search, Star, Heart, Video, MapPin, Loader2, AlertCircle, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useMedicos, useFavoritos, useToggleFavorito } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import type { Medico } from "@/lib/api";

const ESPECIALIDADES = [
  "Todas",
  "Cardiologia",
  "Clínico Geral",
  "Dermatologia",
  "Endocrinologia",
  "Neurologia",
  "Ortopedia",
  "Pediatria",
  "Psiquiatria",
  "Ginecologia",
  "Oftalmologia",
];

const CONVENIOS = [
  "Todos",
  "Unimed",
  "Bradesco Saúde",
  "SulAmérica",
  "Amil",
  "Hapvida",
  "Porto Seguro",
  "Particular",
];

const AVATAR_COLORS = [
  "from-emerald-400 to-teal-600",
  "from-blue-400 to-indigo-600",
  "from-violet-400 to-purple-600",
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-600",
  "from-cyan-400 to-sky-600",
];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const BuscaMedicos = () => {
  const [busca, setBusca] = useState("");
  const [espFiltro, setEspFiltro] = useState("Todas");
  const [convFiltro, setConvFiltro] = useState("Todos");
  const [apenFav, setApenFav] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: medicos = [], isLoading, isError, error } = useMedicos();
  const { data: favoritos = [] } = useFavoritos();
  const toggleFavorito = useToggleFavorito();

  const favIds = useMemo(() => new Set(favoritos.map(f => f.medico_id)), [favoritos]);

  const medicosFiltrados = useMemo(() => {
    return (medicos as Medico[]).filter(m => {
      const termo = busca.toLowerCase();
      const matchBusca = !termo ||
        m.nome.toLowerCase().includes(termo) ||
        m.especialidade.toLowerCase().includes(termo);
      const matchEsp = espFiltro === "Todas" || m.especialidade === espFiltro;
      const matchConv = convFiltro === "Todos" || (m.convenios ?? []).includes(convFiltro);
      const matchFav = !apenFav || favIds.has(m.id);
      return matchBusca && matchEsp && matchConv && matchFav && m.ativo;
    });
  }, [medicos, busca, espFiltro, convFiltro, apenFav, favIds]);

  const handleAgendar = (m: Medico) => {
    const tipos = (m.tipos_consulta ?? ['PRESENCIAL']).join(',');
    const url = `/paciente/selecao-horario?medico_id=${m.id}&medico_nome=${encodeURIComponent(m.nome)}&especialidade=${encodeURIComponent(m.especialidade)}&medico_crm=${encodeURIComponent(m.crm ?? "")}&tipos_consulta=${encodeURIComponent(tipos)}`;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(url)}`);
    } else {
      navigate(url);
    }
  };

  const handleToggleFav = (medicoId: number) => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent("/busca-medicos")}`);
      return;
    }
    toggleFavorito.mutate({ medico_id: medicoId, favorito: favIds.has(medicoId) });
  };

  const hasFiltersActive = espFiltro !== "Todas" || convFiltro !== "Todos" || busca || apenFav;
  const limparFiltros = () => { setBusca(""); setEspFiltro("Todas"); setConvFiltro("Todos"); setApenFav(false); };

  const content = (
    <div className="max-w-3xl mx-auto space-y-0">

      {/* ── HERO COM BUSCA ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary to-primary-glow rounded-2xl p-6 mb-5 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_white,_transparent_60%)]" />
        <div className="relative">
          <p className="text-primary-foreground/80 text-sm font-medium mb-1">Saúde 360</p>
          <h1 className="text-2xl font-bold mb-4 leading-tight">
            Encontre seu <br />especialista ideal
          </h1>

          {/* Barra de busca */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
            <input
              id="busca-medico"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full h-12 pl-11 pr-12 rounded-xl bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/30 shadow-md"
              placeholder="Especialidade ou nome do médico..."
              autoComplete="off"
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── SCROLL DE ESPECIALIDADES ───────────────────────────────── */}
      <div className="mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scroll-hide -mx-4 px-4">
          {ESPECIALIDADES.map(esp => {
            const active = espFiltro === esp;
            return (
              <button
                key={esp}
                onClick={() => setEspFiltro(esp)}
                className={`flex-shrink-0 h-9 px-4 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border/60 hover:border-primary/40 hover:text-primary"
                }`}
              >
                {esp}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── BARRA DE FILTROS SECUNDÁRIOS ──────────────────────────── */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Carregando..." : `${medicosFiltrados.length} profissional${medicosFiltrados.length !== 1 ? "is" : ""}`}
        </p>

        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={() => setApenFav(v => !v)}
              className={`h-9 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border transition-colors ${
                apenFav
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border/60 text-foreground hover:border-primary/40"
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${apenFav ? "fill-current" : ""}`} />
              Favoritos
            </button>
          )}
          <button
            onClick={() => setFiltrosAbertos(v => !v)}
            className={`h-9 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border transition-colors ${
              filtrosAbertos || convFiltro !== "Todos"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border/60 text-foreground hover:border-primary/40"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
          </button>
          {hasFiltersActive && (
            <button onClick={limparFiltros} className="h-9 px-3 rounded-lg text-xs font-medium text-destructive border border-destructive/30 hover:bg-destructive/5 transition-colors">
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Painel de filtros expandível */}
      {filtrosAbertos && (
        <div className="card-elevated p-4 mb-4 animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Plano de saúde</p>
          <div className="flex flex-wrap gap-2">
            {CONVENIOS.map(conv => {
              const active = convFiltro === conv;
              return (
                <button
                  key={conv}
                  onClick={() => setConvFiltro(conv)}
                  className={`h-8 px-3 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border/50 hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {conv}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ESTADOS DE LOADING / ERRO ─────────────────────────────── */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
          <p className="text-sm">Buscando profissionais...</p>
        </div>
      )}

      {isError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive text-sm">Erro ao carregar médicos</p>
            <p className="text-xs text-muted-foreground mt-1">{(error as Error)?.message ?? "Verifique se o backend está rodando."}</p>
          </div>
        </div>
      )}

      {/* ── LISTA DE MÉDICOS (cards horizontais estilo agendacendap) ─ */}
      {!isLoading && !isError && (
        <div className="space-y-3">
          {medicosFiltrados.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Nenhum profissional encontrado</p>
              <p className="text-sm mt-1">Tente ajustar os filtros ou a busca.</p>
              {hasFiltersActive && (
                <button onClick={limparFiltros} className="mt-4 text-sm text-primary font-medium hover:underline">
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            medicosFiltrados.map((m, index) => {
              if (index === 0) {
                m.tipos_consulta = ["PRESENCIAL", "TELECONSULTA"];
              }
              const isFav = favIds.has(m.id);
              const initials = m.nome.split(" ").slice(-2).map(n => n[0]).join("").toUpperCase();
              const avatarClass = getAvatarColor(m.id);

              return (
                <article
                  key={m.id}
                  className="card-elevated overflow-hidden hover:shadow-elevated transition-shadow"
                >
                  <div className="flex items-stretch">
                    {/* Avatar */}
                    <div className={`w-20 shrink-0 bg-gradient-to-br ${avatarClass} flex items-center justify-center`}>
                      {m.foto_url ? (
                        <img src={m.foto_url} alt={m.nome} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-xl">{initials}</span>
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm leading-tight truncate">{m.nome}</h3>
                          <p className="text-xs text-primary font-medium mt-0.5">{m.especialidade}</p>
                          {m.crm && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">CRM: {m.crm}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleToggleFav(m.id)}
                          className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                            isFav ? "text-destructive bg-destructive/5" : "text-muted-foreground hover:bg-muted"
                          }`}
                          title={isFav ? "Remover dos favoritos" : "Favoritar"}
                        >
                          <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                        </button>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-1 mt-2">
                        {[1,2,3,4,5].map(i => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i <= Math.round((m.nps_medio ?? 0) / 2) ? "text-warning fill-warning" : "text-border"}`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">
                          {Number(m.nps_medio ?? 0).toFixed(1)} ({m.total_avaliacoes ?? 0})
                        </span>
                      </div>

                      {/* Tags de modalidade — baseadas nos tipos_consulta do médico */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {(m.tipos_consulta ?? ['PRESENCIAL']).map(t => {
                          const upper = t.toUpperCase();
                          if (upper === 'TELECONSULTA') return (
                            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-info-soft text-accent-foreground">
                              <Video className="h-2.5 w-2.5" /> Teleconsulta
                            </span>
                          );
                          if (upper === 'PRESENCIAL') return (
                            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                              <MapPin className="h-2.5 w-2.5" /> Presencial
                            </span>
                          );
                          return null;
                        })}
                        {(m.convenios ?? []).slice(0, 2).map(c => (
                          <span key={c} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-soft text-primary">
                            {c}
                          </span>
                        ))}
                        {(m.convenios ?? []).length > 2 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                            +{m.convenios!.length - 2}
                          </span>
                        )}
                      </div>

                      {/* Bio */}
                      {m.mini_curriculo && (
                        <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{m.mini_curriculo}</p>
                      )}

                      {/* Rodapé do card */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs text-success font-medium">✓ Disponível</p>
                        <button
                          id={`btn-agendar-${m.id}`}
                          onClick={() => handleAgendar(m)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-glow transition-colors shadow-sm"
                        >
                          Agendar
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );

  if (!user) {
    return <PublicShell>{content}</PublicShell>;
  }

  return <AppShell title="Busca de Médicos">{content}</AppShell>;
};

export default BuscaMedicos;
