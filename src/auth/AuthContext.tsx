import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

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
  proveedor: boolean;
} | null;

type User = {
  email: string;
  username: string;
  usernames: string[]; // Múltiples empresas/cuentas asignadas
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
  activeUsername: string; // Empresa activa seleccionada
  setActiveUsername: (username: string) => void; // Cambiar empresa activa
  login: (
    email: string,
    password: string,
  ) => Promise<{
    email: string;
    username: string;
    usernames: string[];
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
  const [activeUsername, setActiveUsernameState] = useState<string>(
    () => localStorage.getItem("active_username") || "",
  );

  // Setter que persiste en localStorage
  const setActiveUsername = useCallback((username: string) => {
    setActiveUsernameState(username);
    localStorage.setItem("active_username", username);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const usernames =
          d.user.usernames && d.user.usernames.length > 0
            ? d.user.usernames
            : [d.user.username];

        setUser({
          email: d.user.sub,
          username: d.user.username,
          usernames,
          nombreuser: d.user.nombreuser,
          ejecutivo: d.user.ejecutivo || null,
          roles: d.user.roles || null,
        });

        // Establecer activeUsername si no hay uno válido guardado
        const stored = localStorage.getItem("active_username");
        if (!stored || !usernames.includes(stored)) {
          setActiveUsername(usernames[0]);
        }
      })
      .catch(() => {
        setToken(null);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("active_username");
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

    const usernames =
      data.user.usernames && data.user.usernames.length > 0
        ? data.user.usernames
        : [data.user.username];

    const userData = {
      ...data.user,
      usernames,
    };
    setUser(userData);

    // Establecer la primera empresa como activa
    setActiveUsername(usernames[0]);

    return userData;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setActiveUsernameState("");
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
      value={{
        user,
        token,
        activeUsername,
        setActiveUsername,
        login,
        logout,
        getEjecutivos,
        getMisClientes,
      }}
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
