// src/hooks/useExecutiveNotifications.ts
// Polls the executive notification feed and exposes actions for the navbar bell.
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";

const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://portalclientes.seemanngroup.com";

const POLL_INTERVAL_MS = 45_000;

export interface ExecutiveNotification {
  _id: string;
  ejecutivoEmail: string;
  sessionId: string;
  type: "QUOTE_COMPLETED" | "QUOTE_ABANDONED";
  clientEmail: string;
  clientUsername: string;
  clientNombre?: string;
  quoteType: "AIR" | "FCL" | "LCL" | "LASTMILE";
  quoteNumber?: string;
  route?: { origin?: string; destination?: string };
  read: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseExecutiveNotificationsReturn {
  notifications: ExecutiveNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
}

export function useExecutiveNotifications(
  enabled: boolean,
): UseExecutiveNotificationsReturn {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<ExecutiveNotification[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !token) return;
    try {
      setLoading(true);
      const resp = await fetch(`${API_BASE_URL}/api/executive-notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      setNotifications(
        Array.isArray(data?.notifications) ? data.notifications : [],
      );
    } catch {
      // silent — bell is non-critical
    } finally {
      setLoading(false);
    }
  }, [enabled, token]);

  // Initial fetch + polling
  useEffect(() => {
    if (!enabled || !token) {
      setNotifications([]);
      return;
    }
    void refresh();
    timerRef.current = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, token, refresh]);

  const markAllRead = useCallback(async () => {
    if (!enabled || !token) return;
    // Optimistic update (clears badge immediately)
    setNotifications((prev) =>
      prev.some((n) => !n.read)
        ? prev.map((n) => (n.read ? n : { ...n, read: true }))
        : prev,
    );
    try {
      await fetch(`${API_BASE_URL}/api/executive-notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  }, [enabled, token]);

  const dismiss = useCallback(
    async (id: string) => {
      if (!token) return;
      const prev = notifications;
      setNotifications((curr) => curr.filter((n) => n._id !== id));
      try {
        const resp = await fetch(
          `${API_BASE_URL}/api/executive-notifications/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!resp.ok) {
          setNotifications(prev);
        }
      } catch {
        setNotifications(prev);
      }
    },
    [notifications, token],
  );

  const unreadCount = notifications.reduce(
    (acc, n) => acc + (n.read ? 0 : 1),
    0,
  );

  return { notifications, unreadCount, loading, refresh, markAllRead, dismiss };
}
