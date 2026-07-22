import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import {
  type AuthUser,
  loginRequest,
  meRequest,
  MOBILE_API_BASE,
} from "../../src/auth/authApi";
import { unregisterPushToken } from "../services/pushNotifications";

export type User = AuthUser | null;

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
  ) => Promise<AuthUser>;
  logout: () => void;
};

const TOKEN_KEY = "auth_token";
const USERNAME_KEY = "active_username";
export const LAST_LOGIN_EMAIL_KEY = "last_login_email";

const AuthContext = createContext<AuthCtx | null>(null);

async function readStoredAuth() {
  const [token, activeUsername] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USERNAME_KEY),
  ]);
  return { token, activeUsername: activeUsername || "" };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [activeUsername, setActiveUsernameState] = useState("");

  const setActiveUsername = useCallback(async (username: string) => {
    setActiveUsernameState(username);
    await SecureStore.setItemAsync(USERNAME_KEY, username);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = await readStoredAuth();
      if (cancelled) return;

      if (!stored.token) {
        setLoading(false);
        return;
      }

      setToken(stored.token);
      setActiveUsernameState(stored.activeUsername);

      try {
        const { user: userData, token: refreshed } = await meRequest(
          MOBILE_API_BASE,
          stored.token,
          { client: "mobile" },
        );
        if (cancelled) return;

        if (refreshed && refreshed !== stored.token) {
          setToken(refreshed);
          await SecureStore.setItemAsync(TOKEN_KEY, refreshed);
        }

        setUser(userData);
        if (
          !stored.activeUsername ||
          !userData.usernames.includes(stored.activeUsername)
        ) {
          await setActiveUsername(userData.usernames[0]);
        }
      } catch {
        if (cancelled) return;
        setToken(null);
        setUser(null);
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USERNAME_KEY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setActiveUsername]);

  const login = async (
    email: string,
    password: string,
    turnstileToken?: string,
  ) => {
    const data = await loginRequest(
      MOBILE_API_BASE,
      email,
      password,
      turnstileToken,
      { client: "mobile", tenant: "cl" },
    );
    if (data.requiresTenantSelection) {
      throw new Error(
        "Esta cuenta tiene acceso a varios países. Usa el portal web para elegir.",
      );
    }
    setToken(data.token);
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    await SecureStore.setItemAsync(LAST_LOGIN_EMAIL_KEY, email.trim());
    setUser(data.user);
    await setActiveUsername(data.user.usernames[0]);
    return data.user;
  };

  const logout = async () => {
    const currentToken = token;
    if (currentToken) {
      await unregisterPushToken(currentToken).catch(() => undefined);
    }
    setUser(null);
    setToken(null);
    setActiveUsernameState("");
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USERNAME_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        activeUsername,
        setActiveUsername,
        login,
        logout: () => {
          void logout();
        },
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
