import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ChatbotWidget } from "@/components/chat/ChatbotWidget";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import BuscaMedicos from "./pages/BuscaMedicos";
import GradeHorarios from "./pages/GradeHorarios";
import PortalPaciente from "./pages/PortalPaciente";
import SelecaoHorario from "./pages/SelecaoHorario";
import Confirmacao from "./pages/Confirmacao";
import Pagamento from "./pages/Pagamento";
import Historico from "./pages/Historico";
import CheckIn from "./pages/CheckIn";
import PacienteQRCode from "./pages/PacienteQRCode";
import Assistente from "./pages/Assistente";
import LinhaTempo from "./pages/LinhaTempo";
import Recibos from "./pages/Recibos";
import PagamentoSucesso from "./pages/PagamentoSucesso";
import PagamentoCancelado from "./pages/PagamentoCancelado";
import PainelMedico from "./pages/PainelMedico";
import Prontuario from "./pages/Prontuario";
import AtendimentoMedico from "./pages/AtendimentoMedico";
import Agenda from "./pages/Agenda";
import ConfiguracaoAgenda from "./pages/ConfiguracaoAgenda";
import Teleconsulta from "./pages/Teleconsulta";
import DadosPaciente from "./pages/DadosPaciente";
import PainelRecepcao from "./pages/PainelRecepcao";
import ListaEspera from "./pages/ListaEspera";
import KPIs from "./pages/KPIs";
import RelatorioFinanceiro from "./pages/admin/RelatorioFinanceiro";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

// Listen for logout cache-clear signal
window.addEventListener("auth:clear-cache", () => {
  queryClient.clear();
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/acesso-clinica" element={<Login />} />
            <Route path="/redefinir-senha" element={<Login />} />

            <Route path="/busca-medicos" element={<BuscaMedicos />} />
            <Route path="/grade-horarios" element={<GradeHorarios />} />

            <Route path="/" element={<Navigate to="/busca-medicos" replace />} />

            <Route
              path="/paciente/portal"
              element={
                <ProtectedRoute roles={["paciente"]}>
                  <PortalPaciente />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paciente/busca-medicos"
              element={<Navigate to="/busca-medicos" replace />}
            />
            <Route
              path="/paciente/grade-horarios"
              element={<Navigate to="/grade-horarios" replace />}
            />
            <Route
              path="/paciente/selecao-horario"
              element={
                <ProtectedRoute roles={["paciente"]}>
                  <SelecaoHorario />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paciente/confirmacao"
              element={
                <ProtectedRoute roles={["paciente"]}>
                  <Confirmacao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paciente/pagamento"
              element={
                <ProtectedRoute roles={["paciente"]}>
                  <Pagamento />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pagamento/sucesso"
              element={
                <ProtectedRoute roles={["paciente"]}>
                  <PagamentoSucesso />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pagamento/cancelado"
              element={
                <ProtectedRoute roles={["paciente"]}>
                  <PagamentoCancelado />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paciente/historico"
              element={
                <ProtectedRoute roles={["paciente"]}>
                  <Historico />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paciente/prontuario/:agendamento_id"
              element={
                <ProtectedRoute roles={["paciente"]}>
                  <Prontuario />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paciente/check-in"
              element={
                <ProtectedRoute roles={["paciente"]}>
                  <PacienteQRCode />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paciente/assistente"
              element={
                <ProtectedRoute roles={["paciente"]}>
                  <Assistente />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paciente/linha-tempo"
              element={
                <ProtectedRoute roles={["paciente"]}>
                  <LinhaTempo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paciente/recibos"
              element={
                <ProtectedRoute roles={["paciente"]}>
                  <Recibos />
                </ProtectedRoute>
              }
            />

            <Route
              path="/paciente/teleconsulta"
              element={
                <ProtectedRoute roles={["paciente", "medico", "admin"]}>
                  <Teleconsulta />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paciente/meus-dados"
              element={
                <ProtectedRoute roles={["paciente"]}>
                  <DadosPaciente />
                </ProtectedRoute>
              }
            />

            <Route
              path="/medico/painel"
              element={
                <ProtectedRoute roles={["medico"]}>
                  <PainelMedico />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medico/atendimento/:agendamento_id"
              element={
                <ProtectedRoute roles={["medico"]}>
                  <AtendimentoMedico />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medico/prontuario/:agendamento_id"
              element={
                <ProtectedRoute roles={["medico"]}>
                  <Prontuario />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medico/agenda"
              element={
                <ProtectedRoute roles={["medico"]}>
                  <Agenda />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medico/agenda/configuracao"
              element={
                <ProtectedRoute roles={["medico"]}>
                  <ConfiguracaoAgenda />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medico/teleconsulta"
              element={
                <ProtectedRoute roles={["medico", "paciente", "admin"]}>
                  <Teleconsulta />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medico/dados-paciente/:cpf"
              element={
                <ProtectedRoute roles={["medico"]}>
                  <DadosPaciente />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/painel"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <PainelRecepcao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/lista-espera"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <ListaEspera />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/check-in"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <CheckIn />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/kpis"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <KPIs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/relatorio-financeiro"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <RelatorioFinanceiro />
                </ProtectedRoute>
              }
            />

            <Route path="/painel-medico" element={<Navigate to="/login" replace />} />
            <Route path="/portal-paciente" element={<Navigate to="/login" replace />} />
            <Route path="/painel-recepcao" element={<Navigate to="/login" replace />} />
            <Route path="/prontuario" element={<Navigate to="/login" replace />} />
            <Route path="/agenda" element={<Navigate to="/login" replace />} />
            <Route path="/kpis" element={<Navigate to="/login" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatbotWidget />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
