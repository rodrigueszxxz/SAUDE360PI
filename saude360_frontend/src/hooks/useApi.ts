

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  agendaApi,
  agendamentoApi,
  CriarAgendamentoPayload,
  CriarPixPayload,
  medicosApi,
  pacienteApi,
  pagamentoApi,
  retornoApi,
  triagemApi,
  favoritosApi,
  perfilApi,
  listaEsperaApi,
  notificacoesApi,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

// ── Médicos ───────────────────────────────────────────────────────────────────

export function useMedicos(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['medicos', params],
    queryFn: () => medicosApi.listar(params),
    staleTime: 5 * 60 * 1000, // 5 min — lista de médicos muda pouco
  });
}

// ── Agenda / Slots ────────────────────────────────────────────────────────────

export function useSlots(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['slots', params],
    queryFn: () => agendaApi.listarSlots(params),
    enabled: !!params?.medico_id, // só busca se médico selecionado
    staleTime: 60_000, // 1 min
  });
}

// ── Agendamentos ──────────────────────────────────────────────────────────────

export function useAgendamento(id?: number) {
  return useQuery({
    queryKey: ['agendamento', id],
    queryFn: () => agendamentoApi.buscar(id!),
    enabled: !!id,
  });
}

export function useAgendamentosHoje(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['agendamentos-hoje', params],
    queryFn: () => agendamentoApi.listarHoje(params),
    refetchInterval: 30_000, // atualiza a cada 30s — painel de recepção
  });
}

export function useCriarAgendamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (body: CriarAgendamentoPayload) => agendamentoApi.criar(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['agendamentos-hoje'] });
      toast({ title: 'Agendamento criado!', description: `Protocolo: ${data.agendamento.protocolo}` });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao agendar', description: err.message, variant: 'destructive' });
    },
  });
}

export function useCancelarAgendamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, solicitado_por }: { id: number; solicitado_por?: string }) =>
      agendamentoApi.cancelar(id, solicitado_por),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-hoje'] });
      queryClient.invalidateQueries({ queryKey: ['agendamento'] });
      queryClient.invalidateQueries({ queryKey: ['meus-agendamentos'] });
      toast({ title: 'Consulta cancelada com sucesso.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao cancelar', description: err.message, variant: 'destructive' });
    },
  });
}

export function useAtualizarStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, alterado_por }: { id: number; status: string; alterado_por?: string }) =>
      agendamentoApi.atualizarStatus(id, status, alterado_por),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['agendamento', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['agendamentos-hoje'] });
    },
  });
}

// ── Pagamentos ────────────────────────────────────────────────────────────────

export function usePagamento(id?: number) {
  return useQuery({
    queryKey: ['pagamento', id],
    queryFn: () => pagamentoApi.consultar(id!),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDENTE' ? 5_000 : false, // polling até confirmar
  });
}

export function useCriarPix() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (body: CriarPixPayload) => pagamentoApi.criarPix(body),
    onError: (err: Error) => {
      toast({ title: 'Erro ao gerar PIX', description: err.message, variant: 'destructive' });
    },
  });
}

export function useCriarBoleto() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (body: CriarPixPayload) => pagamentoApi.criarBoleto(body),
    onError: (err: Error) => {
      toast({ title: 'Erro ao gerar Boleto', description: err.message, variant: 'destructive' });
    },
  });
}

export function useCriarCheckoutStripe() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (body: {
      nome?: string;
      cpf?: string;
      agendamento_id?: number;
      convenio?: string;
      carteirinha?: string;
      nome_titular?: string;
      validade_plano?: string;
    }) => pagamentoApi.criarCheckout(body),
    onError: (err: Error) => {
      toast({ title: 'Erro ao iniciar pagamento', description: err.message, variant: 'destructive' });
    },
  });
}

// ── Paciente ──────────────────────────────────────────────────────────────────

export function useHistoricoPaciente(cpf?: string, params?: Record<string, string>) {
  return useQuery({
    queryKey: ['historico', cpf, params],
    queryFn: () => pacienteApi.historicoMedico(cpf!, params),
    enabled: !!cpf && cpf.length === 11,
  });
}

export function useTimelinePaciente(cpf?: string, params?: Record<string, string>) {
  return useQuery({
    queryKey: ['timeline', cpf, params],
    queryFn: () => pacienteApi.timeline(cpf!, params),
    enabled: !!cpf && cpf.length === 11,
  });
}

export function useGerarQR() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (agendamento_id: number) => pacienteApi.gerarQR(agendamento_id),
    onError: (err: Error) => {
      toast({ title: 'Erro ao gerar QR', description: err.message, variant: 'destructive' });
    },
  });
}

export function useValidarQR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (qr_token: string) => pacienteApi.validarQR(qr_token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-hoje'] });
      toast({ title: 'Check-in realizado com sucesso!' });
    },
    onError: (err: Error) => {
      toast({ title: 'QR inválido', description: err.message, variant: 'destructive' });
    },
  });
}

export function useAvaliarConsulta() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ agendamento_id, nota, comentario }: { agendamento_id: number, nota: number, comentario?: string }) =>
      pacienteApi.avaliar(agendamento_id, nota, comentario),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meus-agendamentos'] });
      toast({ title: 'Avaliação enviada com sucesso!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao avaliar', description: err.message, variant: 'destructive' });
    },
  });
}

// ── Triagem ───────────────────────────────────────────────────────────────────

export function useTriagemResumo(agendamento_id?: number) {
  return useQuery({
    queryKey: ['triagem', agendamento_id],
    queryFn: () => triagemApi.buscarResumo(agendamento_id!),
    enabled: !!agendamento_id,
  });
}

export function useResponderTriagem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, perguntas }: { id: number; perguntas: Record<string, string> }) =>
      triagemApi.responder(id, perguntas),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['triagem', vars.id] });
      toast({ title: 'Triagem enviada!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro na triagem', description: err.message, variant: 'destructive' });
    },
  });
}

// ── Retorno ───────────────────────────────────────────────────────────────────

export function useLembretesRetorno() {
  return useQuery({
    queryKey: ['lembretes-retorno'],
    queryFn: retornoApi.listarLembretes,
    staleTime: 60_000,
  });
}

// ── Favoritos ─────────────────────────────────────────────────────────────────

export function useFavoritos() {
  return useQuery({
    queryKey: ['favoritos'],
    queryFn: favoritosApi.listar,
    staleTime: 2 * 60 * 1000,
  });
}

export function useToggleFavorito() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ medico_id, favorito }: { medico_id: number; favorito: boolean }) =>
      favorito ? favoritosApi.remover(medico_id) : favoritosApi.adicionar(medico_id),
    onSuccess: (_, { favorito }) => {
      queryClient.invalidateQueries({ queryKey: ['favoritos'] });
      toast({ title: favorito ? 'Removido dos favoritos' : '❤️ Adicionado aos favoritos' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar favorito', description: err.message, variant: 'destructive' });
    },
  });
}

// ── Perfil ────────────────────────────────────────────────────────────────────

export function usePerfil() {
  return useQuery({
    queryKey: ['perfil'],
    queryFn: perfilApi.buscar,
  });
}

export function useAtualizarPerfil() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dados: Record<string, string>) => perfilApi.atualizar(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfil'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao salvar perfil', description: err.message, variant: 'destructive' });
    },
  });
}

// ── Lista de Espera ───────────────────────────────────────────────────────────
export function useMinhaFilaEspera() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['minha-fila-espera', user?.id],
    queryFn: () => listaEsperaApi.meus(),
    enabled: !!user,
  });
}

export function useEntrarFilaEspera() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (body: { medico_id: string; data_alvo: string; horario_alvo?: string }) => listaEsperaApi.entrar(body),
    onSuccess: () => toast({ title: 'Adicionado à fila de espera!', description: 'Avisaremos assim que houver vaga.' }),
    onError: (err: Error) => toast({ title: 'Erro na fila', description: err.message, variant: 'destructive' }),
  });
}

// ── Notificações ──────────────────────────────────────────────────────────────
export function useNotificacoes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notificacoes', user?.id],
    queryFn: notificacoesApi.minhas,
    enabled: !!user,
    staleTime: 5_000,
    refetchInterval: 30_000,
  });
}

export function useNotificacoesCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notificacoes-count', user?.id],
    queryFn: notificacoesApi.naoLidas,
    enabled: !!user,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });
}

export function useMarcarNotificacaoLida() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (id: number) => notificacoesApi.marcarLida(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes-count', user?.id] });
    },
  });
}

export function useMarcarTodasLidas() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: notificacoesApi.marcarTodasLidas,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes-count', user?.id] });
    },
  });
}
