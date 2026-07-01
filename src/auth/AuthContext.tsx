import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  type AuthUser,
  type Cliente,
  type Ejecutivo,
  ejecutivosRequest,
  loginRequest,
  meRequest,
  misClientesRequest,
  todosClientesRequest,
} from "./authApi";

export type User = AuthUser | null;

type AuthCtx = {
  user: User;
  token: string | null;
  loading: boolean; // true while verifying token on mount
  activeUsername: string; // Empresa activa seleccionada
  setActiveUsername: (username: string) => void; // Cambiar empresa activa
  login: (
    email: string,
    password: string,
    turnstileToken?: string,
  ) => Promise<AuthUser>;
  logout: () => void;
  getEjecutivos: () => Promise<Ejecutivo[]>;
  getMisClientes: () => Promise<Cliente[]>;
  getTodosClientes: () => Promise<Cliente[]>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("auth_token"),
  );
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState<boolean>(
    !!localStorage.getItem("auth_token"),
  );
  const [activeUsername, setActiveUsernameState] = useState<string>(
    () => localStorage.getItem("active_username") || "",
  );

  // Setter que persiste en localStorage
  const setActiveUsername = useCallback((username: string) => {
    setActiveUsernameState(username);
    localStorage.setItem("active_username", username);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    meRequest("", token)
      .then((userData) => {
        setUser(userData);

        const stored = localStorage.getItem("active_username");
        if (!stored || !userData.usernames.includes(stored)) {
          setActiveUsername(userData.usernames[0]);
        }
      })
      .catch(() => {
        setToken(null);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("active_username");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const login = async (
    email: string,
    password: string,
    turnstileToken?: string,
  ) => {
    const data = await loginRequest("", email, password, turnstileToken);
    setToken(data.token);
    localStorage.setItem("auth_token", data.token);
    setUser(data.user);
    setActiveUsername(data.user.usernames[0]);
    return data.user;
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

    return ejecutivosRequest("", token);
  };

  // ✅ NUEVA FUNCIÓN: Obtener clientes asignados al ejecutivo autenticado
  const getMisClientes = useCallback(async (): Promise<Cliente[]> => {
    if (!token) {
      throw new Error("No hay sesión activa");
    }

    return misClientesRequest("", token);
  }, [token]);

  // Obtener TODOS los clientes del sistema (para rol pricing)
  const getTodosClientes = useCallback(async (): Promise<Cliente[]> => {
    if (!token) {
      throw new Error("No hay sesión activa");
    }

    return todosClientesRequest("", token);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        activeUsername,
        setActiveUsername,
        login,
        logout,
        getEjecutivos,
        getMisClientes,
        getTodosClientes,
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
