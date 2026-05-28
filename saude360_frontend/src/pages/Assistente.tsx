import { AppShell } from "@/components/layout/AppShell";
import { Chip } from "@/components/shared/PageHeader";
import { Sparkles, Send, Plus, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { chatbotApi } from "@/lib/api";
import { useNavigate } from "react-router-dom";

interface Mensagem {
  role: "user" | "assistant";
  content: string;
  hora: string;
}

const sugestoes = [
  "Quais são os sintomas de hipertensão arterial?",
  "Interações medicamentosas: Lisinopril + Metformina",
  "Protocolo para manejo de diabetes tipo 2",
  "Como interpretar hemograma completo?",
];

function horaAgora() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const Assistente = () => {
  const { user } = useAuth();
  const initials = user?.nome?.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase() ?? "VC";

  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      role: "assistant",
      content: "Olá! Sou o assistente clínico do Saúde 360. Posso ajudar com dúvidas sobre medicamentos, protocolos clínicos, interpretação de exames e muito mais. Como posso ajudar?",
      hora: horaAgora(),
    },
  ]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, carregando]);

  const enviar = async (texto?: string) => {
    const msg = (texto ?? input).trim();
    if (!msg || carregando) return;
    setInput("");

    const novaMsgs: Mensagem[] = [
      ...mensagens,
      { role: "user", content: msg, hora: horaAgora() },
    ];
    setMensagens(novaMsgs);
    setCarregando(true);

    try {
      const { resposta, acao } = await chatbotApi.mensagem(msg);
      
      setMensagens(prev => [...prev, { role: "assistant", content: resposta, hora: horaAgora() }]);

      if (acao === 'REDIRECT_SCHEDULE') {
        setTimeout(() => {
          navigate('/busca-medicos');
        }, 3000); // Aguarda 3 segundos para o usuário ler a mensagem antes de redirecionar
      }
    } catch {
      setMensagens(prev => [
        ...prev,
        { role: "assistant", content: "Erro ao conectar com o assistente. Verifique sua conexão.", hora: horaAgora() },
      ]);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <AppShell title="Assistente Virtual" subtitle="Powered by IA clínica">
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6 -mx-4 lg:-mx-8 -my-6 lg:-my-8 min-h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="hidden xl:flex flex-col border-r border-border/60 bg-card">
          <div className="p-5 border-b border-border/60">
            <button
              onClick={() => setMensagens([{ role: "assistant", content: "Nova conversa iniciada. Como posso ajudar?", hora: horaAgora() }])}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-glow transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> Nova sessão
            </button>
          </div>
          <div className="p-5 flex-1 overflow-y-auto scroll-hide space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Sugestões rápidas
            </p>
            <ul className="space-y-2">
              {sugestoes.map(s => (
                <li key={s}>
                  <button
                    onClick={() => enviar(s)}
                    className="w-full text-left p-3 rounded-xl border border-border/60 bg-background hover:border-primary/40 hover:bg-primary-soft/40 transition-all text-sm leading-snug"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Chat */}
        <section className="flex flex-col min-h-0">
          <div className="p-5 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Assistente Clínico</h2>
            </div>
            <Chip variant="success">Online</Chip>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {mensagens.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${m.role === "user" ? "bg-primary-soft text-primary" : "bg-primary text-primary-foreground"}`}>
                  {m.role === "user" ? initials : <Sparkles className="h-4 w-4" />}
                </div>
                <div className={`flex-1 max-w-2xl flex flex-col ${m.role === "user" ? "items-end" : ""}`}>
                  <p className={`text-xs text-muted-foreground mb-1 ${m.role === "user" ? "text-right" : ""}`}>
                    {m.role === "user" ? "Você" : "Assistente"} · {m.hora}
                  </p>
                  <div className={`rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border/60 rounded-tl-sm shadow-card"}`}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))}

            {carregando && (
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm p-4 shadow-card flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Pensando...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-5 py-2">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              As respostas são auxiliares. Sempre valide clinicamente antes de aplicar.
            </div>
          </div>

          <div className="p-4 lg:p-5 border-t border-border/60">
            <div className="max-w-3xl mx-auto flex items-end gap-2 p-2 rounded-2xl border border-border bg-card focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <FileText className="h-4 w-4 text-muted-foreground ml-2 mb-3 shrink-0" />
              <textarea
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                placeholder="Pergunte sobre medicamentos, exames, protocolos... (Enter para enviar)"
                className="flex-1 resize-none bg-transparent px-2 py-2.5 text-sm focus:outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={() => enviar()}
                disabled={!input.trim() || carregando}
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground inline-flex items-center justify-center hover:bg-primary-glow disabled:opacity-40 shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export default Assistente;
