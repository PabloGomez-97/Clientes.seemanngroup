import { createContext, useContext, useEffect, useState } from "react";

type Ejecutivo = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
} | null;

type Roles = {
  administrador: boolean;
  pricing: boolean;
  ejecutivo: boolean;
} | null;

type User = {
  email: string;
  username: string;
  nombreuser: string;
  ejecutivo?: Ejecutivo;
  roles?: Roles;
} | null;

// ✅ NUEVO: Tipo para los clientes
type Cliente = {
  id: string;
  email: string;
  username: string;
  nombreuser: string;
  createdAt: string;
};

type AuthCtx = {
  user: User;
  token: string | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{
    email: string;
    username: string;
    nombreuser: string;
    ejecutivo?: Ejecutivo;
    roles?: Roles;
  }>;
  logout: () => void;
  getEjecutivos: () => Promise<Ejecutivo[]>;
  getMisClientes: () => Promise<Cliente[]>; // ✅ NUEVA FUNCIÓN
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("auth_token"),
  );
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) =>
        setUser({
          email: d.user.sub,
          username: d.user.username,
          nombreuser: d.user.nombreuser,
          ejecutivo: d.user.ejecutivo || null,
          roles: d.user.roles || null,
        }),
      )
      .catch(() => {
        setToken(null);
        localStorage.removeItem("auth_token");
      });
  }, [token]);

  const login = async (email: string, password: string) => {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.error || "No se pudo iniciar sesión");
    }
    const data = await r.json();
    setToken(data.token);
    localStorage.setItem("auth_token", data.token);
    setUser(data.user);

    return data.user;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.clear();
  };

  const getEjecutivos = async (): Promise<Ejecutivo[]> => {
    if (!token) {
      throw new Error("No hay sesión activa");
    }

    const r = await fetch("/api/ejecutivos", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!r.ok) {
      throw new Error("Error al obtener ejecutivos");
    }

    const data = await r.json();
    return data.ejecutivos || [];
  };

  // ✅ NUEVA FUNCIÓN: Obtener clientes asignados al ejecutivo autenticado
  const getMisClientes = async (): Promise<Cliente[]> => {
    if (!token) {
      throw new Error("No hay sesión activa");
    }

    const r = await fetch("/api/ejecutivo/clientes", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!r.ok) {
      const errorData = await r.json().catch(() => ({}));
      throw new Error(errorData.error || "Error al obtener clientes");
    }

    const data = await r.json();
    return data.clientes || [];
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, getEjecutivos, getMisClientes }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
};
