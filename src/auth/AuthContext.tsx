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
import {
  AUTH_TENANT_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USERNAME_KEY,
  clearAuthStorage,
  resolveChileMxSession,
} from "./sessionHandoff";

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
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(
    AUTH_USERNAME_KEY,
    user.usernames[0] || user.username,
  );
  if (user.tenant) localStorage.setItem(AUTH_TENANT_KEY, user.tenant);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(AUTH_TOKEN_KEY),
  );
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState<boolean>(
    !!localStorage.getItem(AUTH_TOKEN_KEY),
  );
  const [activeUsername, setActiveUsernameState] = useState<string>(
    () => localStorage.getItem(AUTH_USERNAME_KEY) || "",
  );

  const setActiveUsername = useCallback((username: string) => {
    setActiveUsernameState(username);
    localStorage.setItem(AUTH_USERNAME_KEY, username);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const handoff = resolveChileMxSession();
    if (handoff.action === "clear_for_login") {
      // En /login* con sesión mx: limpiar para mostrar el formulario (rompe loops).
      setToken(null);
      setUser(null);
      clearAuthStorage();
      setLoading(false);
      return;
    }
    if (handoff.action === "redirect_mx") {
      window.location.replace("/mx");
      return;
    }
    if (handoff.action === "stay") {
      // SPA Chile sirviendo /mx (rewrite roto): no validar ni redirigir.
      setLoading(false);
      return;
    }

    setLoading(true);
    meRequest("", token)
      .then(({ user: userData }) => {
        setUser(userData);
        if (userData.tenant) {
          localStorage.setItem(AUTH_TENANT_KEY, userData.tenant);
        } else {
          localStorage.setItem(AUTH_TENANT_KEY, "cl");
        }
        const stored = localStorage.getItem(AUTH_USERNAME_KEY);
        if (!stored || !userData.usernames.includes(stored)) {
          setActiveUsername(userData.usernames[0]);
        }
      })
      .catch((err: Error & { redirectTo?: string }) => {
        if (err.redirectTo?.startsWith("/mx")) {
          localStorage.setItem(AUTH_TENANT_KEY, "mx");
          window.location.replace(err.redirectTo);
          return;
        }
        setToken(null);
        setUser(null);
        clearAuthStorage();
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
    const goingToMx =
      data.redirectTo.startsWith("/mx") || data.user.tenant === "mx";

    if (goingToMx) {
      // Persistir y salir de la SPA Chile sin setState (evita /api/me Chile + 409).
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      localStorage.setItem(AUTH_TENANT_KEY, "mx");
      localStorage.setItem(
        AUTH_USERNAME_KEY,
        data.user.usernames[0] || data.user.username,
      );
      window.location.replace(
        data.redirectTo.startsWith("/mx") ? data.redirectTo.replace(/\/$/, "") || "/mx" : "/mx",
      );
      return { status: "ok", user: data.user, redirectTo: data.redirectTo };
    }

    persistSession(data.token, { ...data.user, tenant: data.user.tenant || "cl" });
    setToken(data.token);
    setUser(data.user);
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
    clearAuthStorage();
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
