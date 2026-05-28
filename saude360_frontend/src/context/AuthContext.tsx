/* eslint-disable react-refresh/only-export-components */
/**
 * AuthContext — Saúde 360
 * Gerencia autenticação JWT com papéis: paciente | medico | admin
 * Segurança: tokens em memória (não localStorage), refresh via httpOnly cookie
 */
import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import { setAccessToken } from "@/lib/api";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type Role = "paciente" | "medico" | "admin";

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  papel: Role;
  /** CPF do paciente (apenas role paciente) */
  cpf?: string;
  /** CRM do médico (apenas role medico) */
  crm?: string;
  /** URL do avatar */
  avatar?: string;
}

interface AuthState {
  user: AuthUser | null;
  /** Access token em memória — NUNCA persiste em localStorage */
  accessToken: string | null;
  loading: boolean;
  initialized: boolean;
}

type AuthAction =
  | { type: "AUTH_SUCCESS"; payload: { user: AuthUser; token: string } }
  | { type: "AUTH_LOADING" }
  | { type: "AUTH_INITIALIZED" }
  | { type: "UPDATE_USER"; payload: Partial<AuthUser> }
  | { type: "LOGOUT" };

interface AuthContextValue extends AuthState {
  login: (email: string, senha: string) => Promise<void>;
  registro: (dados: RegistroDados) => Promise<void>;
  logout: () => Promise<void>;
  /** Verifica se o usuário tem um dos papéis informados */
  temPapel: (...papeis: Role[]) => boolean;
  /** Atualiza o estado do usuário (ex: após salvar perfil) */
  updateUser: (dados: Partial<AuthUser>) => void;
}

export interface RegistroDados {
  nome: string;
  email: string;
  senha: string;
  cpf: string;
  whatsapp?: string;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTH_LOADING":
      return { ...state, loading: true };
    case "AUTH_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.token,
        loading: false,
        initialized: true,
      };
    case "AUTH_INITIALIZED":
      return { ...state, loading: false, initialized: true };
    case "UPDATE_USER":
      if (!state.user) return state;
      return { ...state, user: { ...state.user, ...action.payload } };
    case "LOGOUT":
      return { user: null, accessToken: null, loading: false, initialized: true };
    default:
      return state;
  }
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  loading: true,
  initialized: false,
};

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3002";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ── Sincroniza token em memória com o módulo api ─────────────────────────
  useEffect(() => {
    setAccessToken(state.accessToken);
  }, [state.accessToken]);

  // ── Ouve evento de logout forçado (token expirado) ────────────────────────
  useEffect(() => {
    const handler = () => dispatch({ type: "LOGOUT" });
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  // ── Tenta renovar o access token ao carregar (via httpOnly cookie) ──────────
  useEffect(() => {
    const tryRefresh = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include", // envia httpOnly cookie
        });
        if (res.ok) {
          const data = await res.json();
          dispatch({ type: "AUTH_SUCCESS", payload: { user: data.usuario, token: data.token } });
        } else {
          dispatch({ type: "AUTH_INITIALIZED" });
        }
      } catch {
        dispatch({ type: "AUTH_INITIALIZED" });
      }
    };
    tryRefresh();
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, senha: string) => {
    dispatch({ type: "AUTH_LOADING" });
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Credenciais inválidas");
      dispatch({ type: "AUTH_SUCCESS", payload: { user: data.usuario, token: data.token } });
    } catch (err: unknown) {
      dispatch({ type: "AUTH_INITIALIZED" });
      const msg = err instanceof Error ? err.message : String(err);
      // "Failed to fetch" indica que o backend está fora do ar
      if (msg.toLowerCase().includes("failed to fetch")) {
        throw new Error("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
      }
      throw err;
    }
  }, []);

  // ── Registro de paciente ──────────────────────────────────────────────────
  const registro = useCallback(async (dados: RegistroDados) => {
    dispatch({ type: "AUTH_LOADING" });
    try {
      const res = await fetch(`${API_BASE}/auth/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(dados),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao criar conta");
      dispatch({ type: "AUTH_SUCCESS", payload: { user: data.usuario, token: data.token } });
    } catch (err: unknown) {
      dispatch({ type: "AUTH_INITIALIZED" });
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("failed to fetch")) {
        throw new Error("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
      }
      throw err;
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      // Signal App.tsx to clear React Query cache
      window.dispatchEvent(new Event("auth:clear-cache"));
    } finally {
      dispatch({ type: "LOGOUT" });
    }
  }, []);

  // ── Helper de papel ───────────────────────────────────────────────────────
  const updateUser = useCallback((dados: Partial<AuthUser>) => {
    dispatch({ type: "UPDATE_USER", payload: dados });
  }, []);

  const temPapel = useCallback(
    (...papeis: Role[]) => !!state.user && papeis.includes(state.user.papel),
    [state.user]
  );

  return (
    <AuthContext.Provider value={{ ...state, login, registro, logout, temPapel, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
