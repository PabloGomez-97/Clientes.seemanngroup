import { MOBILE_API_BASE } from "../../src/auth/authApi";

export type BehaviorClientStats = {
  totalEvents: number;
  quotesStarted: number;
  quotesCompleted: number;
  quotesAbandoned: number;
  completionRate: number;
  lastActivity: string;
  quoteTypes: string[];
};

export type BehaviorClientSummary = {
  email: string;
  username: string;
  usernames?: string[];
  nombreuser?: string;
  stats: BehaviorClientStats | null;
};

export type BehaviorSession = {
  sessionId: string;
  quoteType: string;
  startedAt: string;
  endedAt: string;
  status: "completed" | "abandoned" | "in_progress";
  route: { origin: string; destination: string } | null;
  lastStep: { step: string; stepNumber: number; totalSteps: number } | null;
  eventsCount: number;
  quoteNumber?: string | null;
};

export type BehaviorClientDetail = {
  sessions: BehaviorSession[];
  summary: {
    totalSessions: number;
    completed: number;
    abandoned: number;
    byType: Record<
      string,
      { started: number; completed: number; abandoned: number }
    >;
  };
};

async function apiGet<T>(
  path: string,
  token: string,
): Promise<T> {
  const response = await fetch(`${MOBILE_API_BASE.replace(/\/$/, "")}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || "Error al cargar comportamiento",
    );
  }
  return (await response.json()) as T;
}

export async function fetchBehaviorClients(
  token: string,
  scope: "portfolio" | "global" = "global",
): Promise<BehaviorClientSummary[]> {
  const path =
    scope === "global"
      ? "/api/behavior-tracking/all-clients"
      : "/api/behavior-tracking/clients";
  const data = await apiGet<{ clients?: BehaviorClientSummary[] }>(
    path,
    token,
  );
  return Array.isArray(data.clients) ? data.clients : [];
}

/** @deprecated use fetchBehaviorClients */
export async function fetchBehaviorAllClients(
  token: string,
): Promise<BehaviorClientSummary[]> {
  return fetchBehaviorClients(token, "global");
}

export async function fetchBehaviorClientDetail(
  token: string,
  email: string,
  scope: "portfolio" | "global" = "global",
): Promise<BehaviorClientDetail> {
  const suffix = scope === "global" ? "?scope=admin" : "";
  return apiGet<BehaviorClientDetail>(
    `/api/behavior-tracking/client/${encodeURIComponent(email)}${suffix}`,
    token,
  );
}
