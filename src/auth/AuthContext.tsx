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
  type TenantId,
  type TenantOption,
  ejecutivosRequest,
  loginRequest,
  meRequest,
  misClientesRequest,
  todosClientesRequest,
} from "./authApi";

export type User = AuthUser | null;

export type LoginOutcome =
  | { status: "ok"; user: AuthUser; redirectTo: string }
  | {
      status: "select_tenant";
      selectionToken: string;
      tenants: TenantOption[];
    };

type AuthCtx = {
  user: User;
  token: string | null;
  loading: boolean;
  activeUsername: string;
  setActiveUsername: (username: string) => void;
  login: (
    email: string,
    password: string,
    turnstileToken?: string,
  ) => Promise<LoginOutcome>;
  completeTenantLogin: (
    selectionToken: string,
    tenant: TenantId,
  ) => Promise<LoginOutcome & { status: "ok" }>;
  logout: () => void;
  getEjecutivos: () => Promise<Ejecutivo[]>;
  getMisClientes: () => Promise<Cliente[]>;
  getTodosClientes: () => Promise<Cliente[]>;
};

const AuthContext = createContext<AuthCtx | null>(null);

function persistSession(token: string, user: AuthUser) {
  localStorage.setItem("auth_token", token);
  localStorage.setItem("active_username", user.usernames[0] || user.username);
  if (user.tenant) localStorage.setItem("auth_tenant", user.tenant);
}

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
      .then(({ user: userData }) => {
        setUser(userData);
        const stored = localStorage.getItem("active_username");
        if (!stored || !userData.usernames.includes(stored)) {
          setActiveUsername(userData.usernames[0]);
        }
      })
      .catch((err: Error & { redirectTo?: string }) => {
        if (err.redirectTo?.startsWith("/mx")) {
          window.location.assign(err.redirectTo);
          return;
        }
        setToken(null);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("active_username");
        localStorage.removeItem("auth_tenant");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, setActiveUsername]);

  const applySuccess = (data: {
    token: string;
    user: AuthUser;
    redirectTo: string;
  }): LoginOutcome => {
    setToken(data.token);
    setUser(data.user);
    persistSession(data.token, data.user);
    setActiveUsername(data.user.usernames[0]);
    return { status: "ok", user: data.user, redirectTo: data.redirectTo };
  };

  const login = async (
    email: string,
    password: string,
    turnstileToken?: string,
  ): Promise<LoginOutcome> => {
    const data = await loginRequest("", email, password, turnstileToken);
    if (data.requiresTenantSelection) {
      return {
        status: "select_tenant",
        selectionToken: data.selectionToken,
        tenants: data.tenants,
      };
    }
    return applySuccess(data);
  };

  const completeTenantLogin = async (
    selectionToken: string,
    tenant: TenantId,
  ) => {
    const data = await loginRequest("", "", "", undefined, {
      selectionToken,
      tenant,
    });
    if (data.requiresTenantSelection) {
      throw new Error("No se pudo completar la selección de país");
    }
    return applySuccess(data) as LoginOutcome & { status: "ok" };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setActiveUsernameState("");
    localStorage.clear();
  };

  const getEjecutivos = async (): Promise<Ejecutivo[]> => {
    if (!token) throw new Error("No hay sesión activa");
    return ejecutivosRequest("", token);
  };

  const getMisClientes = useCallback(async (): Promise<Cliente[]> => {
    if (!token) throw new Error("No hay sesión activa");
    return misClientesRequest("", token);
  }, [token]);

  const getTodosClientes = useCallback(async (): Promise<Cliente[]> => {
    if (!token) throw new Error("No hay sesión activa");
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
        completeTenantLogin,
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
