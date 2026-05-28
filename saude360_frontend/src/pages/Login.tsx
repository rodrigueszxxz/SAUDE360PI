/**
 * Login — Saúde 360
 * Tela unificada com: login paciente, registro, esqueci senha, redefinir senha
 * Portal da clínica (/acesso-clinica): login para médico e admin
 */
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation, Link, useSearchParams } from "react-router-dom";
import { useAuth, RegistroDados } from "@/context/AuthContext";
import { Eye, EyeOff, HeartPulse, Loader2, AlertCircle, CheckCircle2, Building2, User } from "lucide-react";
import { authApi } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatarCPF(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function validarCPF(cpf: string) {
  const n = cpf.replace(/\D/g, "");
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +n[i] * (10 - i);
  let r = (s * 10) % 11; if (r === 10 || r === 11) r = 0;
  if (r !== +n[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +n[i] * (11 - i);
  r = (s * 10) % 11; if (r === 10 || r === 11) r = 0;
  return r === +n[10];
}
const senhaForca = (s: string) => {
  let pts = 0;
  if (s.length >= 8) pts++;
  if (/[A-Z]/.test(s)) pts++;
  if (/[0-9]/.test(s)) pts++;
  if (/[^A-Za-z0-9]/.test(s)) pts++;
  return pts;
};
const forcaCores = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-emerald-400", "bg-emerald-500"];
const forcaLabels = ["", "Fraca", "Razoável", "Boa", "Forte"];

type Aba = "login" | "registro" | "esqueci" | "redefinir";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, registro, user } = useAuth();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const redirectParam = searchParams.get("redirect");

  const isClinica = location.pathname === "/acesso-clinica";
  const resetToken = searchParams.get("token");

  const [aba, setAba] = useState<Aba>(resetToken ? "redefinir" : "login");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarSenha2, setMostrarSenha2] = useState(false);

  const [emailLogin, setEmailLogin] = useState("");
  const [senhaLogin, setSenhaLogin] = useState("");

  const [reg, setReg] = useState<RegistroDados & { senhaConf: string }>({
    nome: "", email: "", senha: "", senhaConf: "", cpf: "", whatsapp: "",
  });

  const [emailEsqueci, setEmailEsqueci] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novaSenhaConf, setNovaSenhaConf] = useState("");

  useEffect(() => {
    if (user) {
      const dest = redirectParam || from || painelPorPapel(user.papel);
      navigate(dest, { replace: true });
    }
  }, [user, from, navigate, redirectParam]);

  function painelPorPapel(papel: string) {
    if (papel === "medico") return "/medico/painel";
    if (papel === "admin") return "/admin/painel";
    return "/paciente/portal";
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (!emailLogin || !senhaLogin) return setErro("Preencha e-mail e senha.");
    setCarregando(true);
    try {
      await login(emailLogin, senhaLogin);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setCarregando(false);
    }
  }, [login, emailLogin, senhaLogin]);

  // ── Registro ───────────────────────────────────────────────────────────────
  const handleRegistro = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(""); setSucesso("");
    if (!reg.nome.trim()) return setErro("Informe seu nome completo.");
    if (!reg.email.includes("@")) return setErro("E-mail inválido.");
    if (!validarCPF(reg.cpf)) return setErro("CPF inválido.");
    if (reg.senha.length < 8) return setErro("A senha deve ter ao menos 8 caracteres.");
    if (senhaForca(reg.senha) < 2) return setErro("Use letras maiúsculas, números ou símbolos.");
    if (reg.senha !== reg.senhaConf) return setErro("As senhas não coincidem.");
    setCarregando(true);
    try {
      await registro({
        nome: reg.nome.trim(),
        email: reg.email.trim().toLowerCase(),
        senha: reg.senha,
        cpf: reg.cpf.replace(/\D/g, ""),
        whatsapp: reg.whatsapp,
      });
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setCarregando(false);
    }
  }, [registro, reg]);

  // ── Esqueci senha ──────────────────────────────────────────────────────────
  const handleEsqueci = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(""); setSucesso("");
    if (!emailEsqueci.includes("@")) return setErro("E-mail inválido.");
    setCarregando(true);
    try {
      await authApi.esqueceuSenha(emailEsqueci.trim().toLowerCase());
      setSucesso("Se o e-mail estiver cadastrado, você receberá as instruções em breve.");
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao processar solicitação");
    } finally {
      setCarregando(false);
    }
  }, [emailEsqueci]);

  // ── Redefinir senha ────────────────────────────────────────────────────────
  const handleRedefinir = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(""); setSucesso("");
    if (novaSenha.length < 8) return setErro("A senha deve ter ao menos 8 caracteres.");
    if (novaSenha !== novaSenhaConf) return setErro("As senhas não coincidem.");
    if (!resetToken) return setErro("Token inválido. Use o link do e-mail.");
    setCarregando(true);
    try {
      await authApi.redefinirSenha(resetToken, novaSenha);
      setSucesso("Senha redefinida com sucesso! Faça login.");
      setTimeout(() => { setAba("login"); setSucesso(""); }, 2500);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao redefinir senha");
    } finally {
      setCarregando(false);
    }
  }, [novaSenha, novaSenhaConf, resetToken]);

  const forca = senhaForca(aba === "registro" ? reg.senha : novaSenha);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Lado Esquerdo - Imagem (apenas Desktop) */}
      <div className="hidden lg:flex w-3/5 relative bg-zinc-900">
        <img 
          src="/bg-saude.png" 
          alt="Família feliz" 
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent" />
        <div className="absolute bottom-16 left-16 max-w-lg text-white">
          <img src="/logo-full.png" alt="Saúde 360" className="h-16 mb-6 object-contain filter drop-shadow-md" />
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Agende. Cuide.<br />Viva melhor.
          </h1>
          <p className="text-lg opacity-90">
            Acesso rápido, fácil e seguro ao seu histórico médico, agendamentos e teleconsultas.
          </p>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="w-full lg:w-2/5 flex flex-col justify-center px-8 sm:px-16 py-12 bg-white relative overflow-y-auto">
        
        <div className="w-full max-w-[400px] mx-auto">
          {/* Logo Mobile */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src="/logo-full.png" alt="Saúde 360" className="h-14 object-contain mb-3" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1a1a1a]">
              {aba === "login" ? "Bem-vindo(a)!" : aba === "registro" ? "Criar conta" : aba === "esqueci" ? "Recuperar acesso" : "Redefinir senha"}
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              {aba === "login" ? "Insira seus dados para acessar o portal." : aba === "registro" ? "Preencha os dados abaixo." : "Siga as instruções para voltar a acessar."}
            </p>
          </div>

          {/* Tabs — apenas no portal paciente e apenas para login/registro */}
          {!isClinica && aba !== "esqueci" && aba !== "redefinir" && (
            <div className="flex border-b border-gray-200 mb-8">
              {(["login", "registro"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setAba(t); setErro(""); setSucesso(""); }}
                  className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 ${
                    aba === t ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {t === "login" ? "Entrar" : "Cadastrar"}
                </button>
              ))}
            </div>
          )}

          {/* Feedback */}
          {erro && (
            <div className="flex items-start gap-2 p-3.5 rounded-lg bg-red-50 border border-red-100 mb-6">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600 font-medium">{erro}</p>
            </div>
          )}
          {sucesso && (
            <div className="flex items-start gap-2 p-3.5 rounded-lg bg-green-50 border border-green-100 mb-6">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <p className="text-sm text-green-600 font-medium">{sucesso}</p>
            </div>
          )}

          {/* ── FORM LOGIN ── */}
          {(aba === "login") && (
            <form onSubmit={handleLogin} className="space-y-5" noValidate>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">CPF ou E-mail</label>
                <input type="email" autoComplete="email" value={emailLogin}
                  onChange={(e) => setEmailLogin(e.target.value)}
                  placeholder={isClinica ? "medico@clinica.com" : "Digite seu CPF ou E-mail"}
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" disabled={carregando} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Senha</label>
                </div>
                <div className="relative">
                  <input type={mostrarSenha ? "text" : "password"} autoComplete="current-password"
                    value={senhaLogin} onChange={(e) => setSenhaLogin(e.target.value)}
                    placeholder="Sua senha" className="w-full h-12 px-4 pr-10 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" disabled={carregando} />
                  <button type="button" onClick={() => setMostrarSenha(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="mt-3 text-right">
                  <button type="button" onClick={() => { setAba("esqueci"); setErro(""); setSucesso(""); }}
                    className="text-sm font-medium text-primary hover:underline">
                    Esqueceu a senha?
                  </button>
                </div>
              </div>
              <button type="submit" disabled={carregando}
                className="w-full h-12 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-6">
                {carregando ? <><Loader2 className="h-4 w-4 animate-spin" /> Acessando…</> : "Acessar"}
              </button>
              {isClinica && (
                <div className="text-xs text-gray-500 text-center pt-4 space-y-2">
                  <p>Credenciais de demonstração:</p>
                  <div className="bg-gray-50 rounded-lg p-3 text-left space-y-1 font-mono text-[11px] border border-gray-200">
                    <p><strong>Médico:</strong> carlos@clinica.com / Medico@123</p>
                    <p><strong>Admin:</strong> admin@clinica.com / Admin@123</p>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* ── FORM REGISTRO ── */}
          {aba === "registro" && !isClinica && (
            <form onSubmit={handleRegistro} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome completo</label>
                <input type="text" autoComplete="name" value={reg.nome}
                  onChange={(e) => setReg(r => ({ ...r, nome: e.target.value }))}
                  placeholder="Nome do beneficiário" className="w-full h-12 px-4 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" disabled={carregando} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">CPF</label>
                  <input type="text" inputMode="numeric" autoComplete="off" value={reg.cpf}
                    onChange={(e) => setReg(r => ({ ...r, cpf: formatarCPF(e.target.value) }))}
                    placeholder="000.000.000-00" className="w-full h-12 px-4 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" disabled={carregando} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp</label>
                  <input type="tel" autoComplete="tel" value={reg.whatsapp}
                    onChange={(e) => setReg(r => ({ ...r, whatsapp: e.target.value }))}
                    placeholder="(00) 00000-0000" className="w-full h-12 px-4 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" disabled={carregando} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mail</label>
                <input type="email" autoComplete="email" value={reg.email}
                  onChange={(e) => setReg(r => ({ ...r, email: e.target.value }))}
                  placeholder="Seu melhor e-mail" className="w-full h-12 px-4 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" disabled={carregando} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Senha de acesso</label>
                <div className="relative">
                  <input type={mostrarSenha ? "text" : "password"} autoComplete="new-password" value={reg.senha}
                    onChange={(e) => setReg(r => ({ ...r, senha: e.target.value }))}
                    placeholder="Mínimo 8 caracteres" className="w-full h-12 px-4 pr-10 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" disabled={carregando} />
                  <button type="button" onClick={() => setMostrarSenha(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {reg.senha && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= forca ? forcaCores[forca] : "bg-gray-200"}`} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmar senha</label>
                <div className="relative">
                  <input type={mostrarSenha2 ? "text" : "password"} autoComplete="new-password" value={reg.senhaConf}
                    onChange={(e) => setReg(r => ({ ...r, senhaConf: e.target.value }))}
                    placeholder="Repita a senha criada" className="w-full h-12 px-4 pr-10 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" disabled={carregando} />
                  <button type="button" onClick={() => setMostrarSenha2(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {mostrarSenha2 ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={carregando}
                className="w-full h-12 mt-4 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {carregando ? <><Loader2 className="h-4 w-4 animate-spin" /> Criando…</> : "Cadastrar Agora"}
              </button>
            </form>
          )}

          {/* ── ESQUECI SENHA ── */}
          {aba === "esqueci" && (
            <form onSubmit={handleEsqueci} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mail</label>
                <input type="email" autoComplete="email" value={emailEsqueci}
                  onChange={(e) => setEmailEsqueci(e.target.value)}
                  placeholder="Seu e-mail cadastrado" className="w-full h-12 px-4 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" disabled={carregando} />
              </div>
              <button type="submit" disabled={carregando}
                className="w-full h-12 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {carregando ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : "Enviar link de recuperação"}
              </button>
              <button type="button" onClick={() => { setAba("login"); setErro(""); setSucesso(""); }}
                className="w-full py-2 text-sm font-medium text-primary hover:underline mt-2">
                Voltar para o login
              </button>
            </form>
          )}

          {/* ── REDEFINIR SENHA ── */}
          {aba === "redefinir" && (
            <form onSubmit={handleRedefinir} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nova senha</label>
                <div className="relative">
                  <input type={mostrarSenha ? "text" : "password"} value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mín. 8 caracteres" className="w-full h-12 px-4 pr-10 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" disabled={carregando} />
                  <button type="button" onClick={() => setMostrarSenha(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmar nova senha</label>
                <input type="password" value={novaSenhaConf}
                  onChange={(e) => setNovaSenhaConf(e.target.value)}
                  placeholder="Repita a nova senha" className="w-full h-12 px-4 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" disabled={carregando} />
              </div>
              <button type="submit" disabled={carregando}
                className="w-full h-12 mt-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {carregando ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</> : "Salvar nova senha"}
              </button>
            </form>
          )}

          <div className="mt-12 pt-6 border-t border-gray-100 flex flex-col items-center gap-3">
            {!isClinica && aba === "login" && (
              <p className="text-xs font-medium text-gray-500">
                Acesso corporativo?{" "}
                <Link to="/acesso-clinica" className="text-primary hover:underline font-bold">Portal da Clínica</Link>
              </p>
            )}
            {isClinica && (
              <p className="text-xs font-medium text-gray-500">
                <Link to="/login" className="text-primary hover:underline flex items-center justify-center gap-1 font-bold">
                  <User className="h-4 w-4" /> Sou paciente
                </Link>
              </p>
            )}
            <p className="text-[10px] text-gray-400">© {new Date().getFullYear()} Saúde 360. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
