/**
 * ProtectedRoute — Saúde 360
 * Guard de rotas por papel (paciente | medico | admin)
 * Paciente JAMAIS acessa rotas de médico ou admin.
 */
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, Role } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Papéis permitidos. Se vazio/ausente, qualquer usuário autenticado acessa */
  roles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { user, loading, initialized } = useAuth();
  const location = useLocation();

  // Aguarda inicialização do contexto (refresh silencioso)
  if (!initialized || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="h-10 w-10 rounded-full bg-primary/30" />
          <p className="text-sm text-muted-foreground">Verificando acesso…</p>
        </div>
      </div>
    );
  }

  // Não autenticado → vai para login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Papel incorreto → redireciona para o painel certo do usuário
  if (roles && roles.length > 0 && !roles.includes(user.papel)) {
    const home = painelPorPapel(user.papel);
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
};

/** Rota home de cada papel */
function painelPorPapel(papel: Role): string {
  switch (papel) {
    case "medico":
      return "/medico/painel";
    case "admin":
      return "/admin/painel";
    case "paciente":
    default:
      return "/paciente/portal";
  }
}
