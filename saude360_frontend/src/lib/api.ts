

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3002";
// Apenas loga em desenvolvimento
if (import.meta.env.DEV) {
  console.log('🔧 API_BASE:', API_BASE);
}

// ─── Token em memória ─────────────────────────────────────────────────────────
let _accessToken: string | null = null;
let _refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

async function refreshToken(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json();
      _accessToken = data.token;
      return data.token as string;
    })
    .catch(() => null)
    .finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

// ─── Tipos exportados ─────────────────────────────────────────────────────────
export interface Medico {
  id: number;
  nome: string;
  especialidade: string;
  crm?: string;
  foto_url?: string;
  mini_curriculo?: string;
  nps_medio?: number;
  total_avaliacoes?: number;
  convenios?: string[];
  tipos_consulta?: string[];  // ['PRESENCIAL', 'TELECONSULTA'] ou apenas um
  ativo?: boolean;
}

export interface Agendamento {
  id: number;
  nome: string;
  cpf: string;
  whatsapp?: string;
  medico_id?: number;
  slot_id?: number;
  data_consulta?: string;
  horario?: string;
  status: string;
  protocolo?: string;
  qr_token?: string;
  tipo_consulta?: string;
  meet_link?: string;
  criado_em?: string;
  medicos?: Medico;
  pacientes?: { nome?: string; cpf?: string };
}

export interface Pagamento {
  id: number;
  nome: string;
  cpf: string;
  valor: number;
  codigo_pix: string;
  status: string;
  agendamento_id?: number;
  expira_em?: string;
}

export interface Slot {
  id: number;
  medico_id: number;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
}

export interface CriarAgendamentoPayload {
  nome: string;
  cpf: string;
  whatsapp?: string;
  medico_id?: number;
  slot_id?: number;
  data_consulta?: string;
  horario?: string;
  tipo_consulta?: string;
}

export interface CriarPixPayload {
  nome: string;
  cpf: string;
  valor: number;
  agendamento_id: number;
  convenio?: string;
  carteirinha?: string;
  nome_titular?: string;
  validade_plano?: string;
}

// ─── Fetch autenticado ────────────────────────────────────────────────────────
interface ApiOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  publico?: boolean;
  _retries?: number;
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { publico = false, _retries = 1, headers = {}, ...rest } = options;

  const h: Record<string, string> = { "Content-Type": "application/json", ...headers };
  if (!publico && _accessToken) h["Authorization"] = `Bearer ${_accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...rest,
      headers: h,
      credentials: "include",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("failed to fetch")) {
      throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão ou se o backend está rodando.");
    }
    throw err;
  }

  if (res.status === 401 && !publico && _retries > 0) {
    const newToken = await refreshToken();
    if (newToken) return apiFetch<T>(endpoint, { ...options, _retries: _retries - 1 });
    window.dispatchEvent(new CustomEvent("auth:logout"));
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!res.ok) {
    let mensagem = "Erro na requisição";
    try {
      const body = await res.json();
      mensagem = body.erro || body.message || mensagem;
    } catch { /* ignore */ }
    throw new Error(mensagem);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string, opts?: ApiOptions) => apiFetch<T>(url, { ...opts, method: "GET" }),
  post: <T>(url: string, body: unknown, opts?: ApiOptions) =>
    apiFetch<T>(url, { ...opts, method: "POST", body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown, opts?: ApiOptions) =>
    apiFetch<T>(url, { ...opts, method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(url: string, opts?: ApiOptions) => apiFetch<T>(url, { ...opts, method: "DELETE" }),
};

// ─── APIs por domínio (nomes que useApi.ts importa) ───────────────────────────

export const medicosApi = {
  listar: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<Medico[]>(`/medicos${qs}`, { publico: true });
  },
  buscar: (id: number) => apiFetch<Medico>(`/medicos/${id}`, { publico: true }),
};

export const agendaApi = {
  listarSlots: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<Slot[]>(`/agenda${qs}`);
  },
  bloquear: (body: unknown) => api.post("/agenda/bloquear", body),
  desbloquear: (id: number) => api.delete(`/agenda/desbloquear/${id}`),
  mover: (body: unknown) => api.patch("/agenda/mover", body),
};

export const agendamentoApi = {
  criar: (body: CriarAgendamentoPayload) =>
    api.post<{ agendamento: Agendamento }>("/agendamento", body),
  buscar: (id: number) => api.get<Agendamento>(`/agendamento/${id}`),
  listarHoje: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<Agendamento[]>(`/agendamento/hoje${qs}`);
  },
  atualizarStatus: (id: number, status: string, alterado_por?: string) =>
    api.patch(`/agendamento/${id}/status`, { status, alterado_por }),
  cancelar: (id: number, solicitado_por?: string) =>
    api.patch(`/agendamento/${id}/cancelar`, { solicitado_por }),
};

export const pagamentoApi = {
  // Backend retorna { mensagem: string, pagamento: Pagamento }
  criarPix: (body: CriarPixPayload) => api.post<{ mensagem: string; pagamento: Pagamento }>('/pagamentos/pix', body),
  criarBoleto: (body: CriarPixPayload) => api.post<{ mensagem: string; pagamento: Pagamento }>('/pagamentos/boleto', body),
  criarCheckout: (body: {
    nome?: string;
    cpf?: string;
    agendamento_id?: number;
    convenio?: string;
    carteirinha?: string;
    nome_titular?: string;
    validade_plano?: string;
  }) => api.post<{ mensagem: string; checkout_url: string; session_id: string; pagamento: Pagamento; valor_final: number }>('/pagamentos/checkout', body),
  consultar: (id: number) => api.get<Pagamento>(`/pagamentos/${id}`),
  meus: () => api.get<Pagamento[]>('/pagamentos/meus'),
  // Usa o token em memória (_accessToken) — NUNCA localStorage
  baixarRecibo: (id: number) =>
    fetch(`${API_BASE}/pagamentos/${id}/recibo`, {
      headers: _accessToken ? { Authorization: `Bearer ${_accessToken}` } : {},
      credentials: 'include',
    }).then(res => {
      if (!res.ok) throw new Error('Erro ao baixar recibo');
      return res.blob();
    }),
};

export const pacienteApi = {
  meusAgendamentos: () => api.get<Agendamento[]>("/agendamento/meus"),
  historicoMedico: (cpf: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get(`/paciente/${cpf}/historico-medico${qs}`);
  },
  timeline: (cpf: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get(`/paciente/${cpf}/timeline${qs}`);
  },
  // QR Code de check-in do paciente (self-serve)
  buscarQR: (agendamento_id: number) =>
    api.get<{ qr_token: string; status: string; data_consulta: string }>(`/paciente/checkin/qr/${agendamento_id}`),
  // Usado pela recepção para validar o QR
  validarQR: (qr_token: string) =>
    api.post("/paciente/checkin/qr", { qr_token }),
  // Link seguro de teleconsulta (autenticado, validado no backend)
  teleconsulta: (agendamento_id: number) =>
    api.get(`/paciente/teleconsulta/${agendamento_id}`),
  recibos: () => api.get("/pagamentos/meus"),
  avaliar: (agendamento_id: number, nota: number, comentario?: string) =>
    api.post(`/paciente/avaliar/${agendamento_id}`, { nota, comentario }),
};

export const triagemApi = {
  buscarResumo: (agendamento_id: number) =>
    api.get(`/triagem/${agendamento_id}`),
  responder: (id: number, perguntas: Record<string, string>) =>
    api.post(`/triagem/${id}/responder`, { perguntas }),
};

export const retornoApi = {
  listarLembretes: () => api.get("/retorno/lembretes"),
  responder: (id: number, resposta: string) =>
    api.patch(`/retorno/lembretes/${id}`, { resposta }),
};

// aliases para compatibilidade com páginas que usam publicoApi / adminApi
export const publicoApi = {
  buscarMedicos: (params: Record<string, string>) => medicosApi.listar(params),
};

export const adminApi = {
  listaEspera: () => api.get("/triagem/lista-espera"),
  checkinQR: (token: string) => pacienteApi.validarQR(token),
  kpis: () => api.get("/admin/kpis"),
  faturamento: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get(`/admin/faturamento${qs}`);
  },
  topMedicos: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get(`/admin/top-medicos${qs}`);
  },
  ocupacao: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get(`/admin/ocupacao${qs}`);
  },
  auditoria: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get(`/admin/auditoria${qs}`);
  },
};

export const authApi = {
  esqueceuSenha: (email: string) =>
    apiFetch('/auth/esqueci-senha', { method: 'POST', body: JSON.stringify({ email }), publico: true }),
  redefinirSenha: (token: string, nova_senha: string) =>
    apiFetch('/auth/redefinir-senha', { method: 'POST', body: JSON.stringify({ token, nova_senha }), publico: true }),
};

export const meuAgendamentosApi = {
  listar: () => api.get<Agendamento[]>('/agendamento/meus'),
};

// ── Favoritos ─────────────────────────────────────────────────────────────────
export interface Favorito {
  medico_id: number;
  criado_em: string;
}

export const favoritosApi = {
  listar: () => api.get<Favorito[]>('/paciente/favoritos'),
  adicionar: (medico_id: number) => api.post('/paciente/favoritos/' + medico_id, {}),
  remover: (medico_id: number) => api.delete('/paciente/favoritos/' + medico_id),
};

export const listaEsperaApi = {
  entrar: (body: { medico_id: string; data_alvo: string; horario_alvo?: string }) => 
    api.post('/lista-espera', body),
  meus: () => api.get('/lista-espera/meus'),
};

// ── Perfil ────────────────────────────────────────────────────────────────────
export const perfilApi = {
  buscar: () => api.get<any>('/paciente/perfil'),
  atualizar: (dados: Record<string, string>) =>
    api.patch<{ mensagem: string; usuario: unknown }>('/paciente/perfil', dados),
};

// ── Notificações ──────────────────────────────────────────────────────────────
export interface Notificacao {
  id: number;
  titulo: string;
  mensagem?: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  lida: boolean;
  link?: string;
  criado_em: string;
}

export const notificacoesApi = {
  minhas: () => api.get<Notificacao[]>('/notificacoes/minhas'),
  naoLidas: () => api.get<{ count: number }>('/notificacoes/nao-lidas'),
  marcarLida: (id: number) => api.patch(`/notificacoes/${id}/lida`, {}),
  marcarTodasLidas: () => api.patch('/notificacoes/lidas-todas', {}),
};

// ── Chatbot ───────────────────────────────────────────────────────────────────
export const chatbotApi = {
  mensagem: (mensagem: string, sessao_id?: string) => 
    api.post<{ resposta: string; intent: string; acao: string; confianca: number }>('/chatbot/mensagem', { mensagem, sessao_id }),
  historico: () => api.get<any[]>('/chatbot/historico'),
};

// ── Prontuário ────────────────────────────────────────────────────────────────
export const prontuarioApi = {
  buscarPorAgendamento: (agendamento_id: number) => api.get<any>(`/prontuario/agendamento/${agendamento_id}`),
  buscarPorCPF: (cpf: string) => api.get<any[]>(`/prontuario/paciente/${cpf}`),
  salvar: (body: any) => body.id ? api.patch(`/prontuario/${body.id}`, body) : api.post('/prontuario', body),
  emitirReceita: (body: any) => api.post('/prontuario/receitas', body),
  emitirAtestado: (body: any) => api.post('/prontuario/atestados', body),
  pedirExame: (body: any) => api.post('/prontuario/pedidos-exame', body),
  adicionarEvolucao: (body: any) => api.post('/prontuario/evolucoes', body),
  listarReceitas: (cpf: string) => api.get<any[]>(`/prontuario/receitas/paciente/${cpf}`),
};

// ── Disponibilidade Médica ───────────────────────────────────────────────────
export const disponibilidadeApi = {
  buscar: (medico_id: number) => api.get<any[]>(`/disponibilidade/medico/${medico_id}`),
  salvar: (body: any) => api.post<any>('/disponibilidade', body),
  remover: (id: number) => api.delete<any>(`/disponibilidade/${id}`),
  buscarPausas: (medico_id: number) => api.get<any[]>(`/disponibilidade/medico/${medico_id}/pausas`),
  salvarPausa: (body: any) => api.post<any>('/disponibilidade/pausas', body),
  buscarBloqueios: (medico_id: number) => api.get<any[]>(`/disponibilidade/medico/${medico_id}/bloqueios`),
  salvarBloqueio: (body: any) => api.post<any>('/disponibilidade/bloqueios', body),
  removerBloqueio: (id: number) => api.delete<any>(`/disponibilidade/bloqueios/${id}`),
  gerarSlots: (body: { medico_id: number; data_inicio: string; data_fim: string }) => api.post<any>('/disponibilidade/gerar-slots', body),
};


