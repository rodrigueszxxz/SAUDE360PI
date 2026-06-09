import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente para uso no proxy
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const backendTarget = env.VITE_API_URL || "http://localhost:3002";

  return {
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    // ── Proxy: evita CORS em dev e alinha com VITE_API_URL ─────────────
    // Todas as chamadas do frontend usam VITE_API_URL diretamente,
    // mas em dev o proxy também intercepta para evitar CORS bloqueado
    // no caso de VITE_API_URL apontar para domínio externo.
    proxy: {
      '/auth': { target: backendTarget, changeOrigin: true, secure: mode === 'production' },
      '/medicos': { target: backendTarget, changeOrigin: true, secure: mode === 'production' },
      '/agendamento': { target: backendTarget, changeOrigin: true, secure: mode === 'production' },
      '/pagamentos': { target: backendTarget, changeOrigin: true, secure: mode === 'production' },
      '/agenda': { target: backendTarget, changeOrigin: true, secure: mode === 'production' },
      '/triagem': { target: backendTarget, changeOrigin: true, secure: mode === 'production' },
      '/retorno': { target: backendTarget, changeOrigin: true, secure: mode === 'production' },
      '/paciente': { target: backendTarget, changeOrigin: true, secure: mode === 'production' },
      '/admin': { target: backendTarget, changeOrigin: true, secure: mode === 'production' },
      '/prontuario': { target: backendTarget, changeOrigin: true, secure: mode === 'production' },
      '/chatbot': { target: backendTarget, changeOrigin: true, secure: mode === 'production' },
      '/disponibilidade': { target: backendTarget, changeOrigin: true, secure: mode === 'production' },
      '/lista-espera': { target: backendTarget, changeOrigin: true, secure: mode === 'production' },
      '/notificacoes': { target: backendTarget, changeOrigin: true, secure: mode === 'production' },
    },
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: [
      "react", "react-dom", "react/jsx-runtime",
      "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core",
    ],
  },
  };
});
