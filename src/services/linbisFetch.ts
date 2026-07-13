/**
 * Wrapper around fetch for Linbis API calls.
 * - Applies a default timeout so callers never hang forever
 * - On 401, refreshes token once and retries
 * - Respects caller AbortSignal (merged with the default timeout)
 */

export const DEFAULT_LINBIS_FETCH_TIMEOUT_MS = 60_000;
export const LINBIS_TOKEN_ENDPOINT_TIMEOUT_MS = 15_000;

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException &&
      (error.name === "AbortError" || error.name === "TimeoutError")) ||
    (error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError"))
  );
}

/** Combine multiple AbortSignals into one that aborts when any source aborts. */
export function anyAbortSignal(...signals: Array<AbortSignal | undefined>): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => {
    if (!controller.signal.aborted) controller.abort();
  };

  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }

  return controller.signal;
}

export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function withDefaultTimeout(
  options: RequestInit,
  timeoutMs = DEFAULT_LINBIS_FETCH_TIMEOUT_MS,
): RequestInit {
  // If the caller already provided a signal (timeout / cancel), respect it as-is.
  if (options.signal) {
    return options;
  }
  return { ...options, signal: createTimeoutSignal(timeoutMs) };
}

export async function linbisFetch(
  url: string,
  options: RequestInit,
  accessToken: string,
  refreshAccessToken: () => Promise<string>,
  fetchTimeoutMs = DEFAULT_LINBIS_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const timedOptions = withDefaultTimeout(options, fetchTimeoutMs);
  const headers = {
    ...Object.fromEntries(new Headers(timedOptions.headers).entries()),
    Authorization: `Bearer ${accessToken}`,
  };

  let response: Response;
  try {
    response = await fetch(url, { ...timedOptions, headers });
  } catch (error) {
    if (isAbortError(error)) {
      const callerAborted = options.signal?.aborted;
      if (callerAborted) throw error;
      throw new DOMException(
        `Linbis request timed out after ${fetchTimeoutMs}ms`,
        "TimeoutError",
      );
    }
    throw error;
  }

  if (response.status === 401) {
    if (timedOptions.signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }

    console.log("[linbisFetch] 401 received, refreshing token and retrying...");
    let newToken: string;
    try {
      newToken = await refreshAccessToken();
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new Error(
        "Sesión Linbis expirada o no renovable. Recarga la página o vuelve a iniciar sesión.",
      );
    }

    if (!newToken) {
      throw new Error(
        "No se pudo renovar el token de Linbis. Recarga la página.",
      );
    }

    if (timedOptions.signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }

    const retryHeaders = {
      ...Object.fromEntries(new Headers(timedOptions.headers).entries()),
      Authorization: `Bearer ${newToken}`,
    };

    try {
      return await fetch(url, { ...timedOptions, headers: retryHeaders });
    } catch (error) {
      if (isAbortError(error)) {
        const callerAborted = options.signal?.aborted;
        if (callerAborted) throw error;
        throw new DOMException(
          `Linbis request timed out after ${fetchTimeoutMs}ms`,
          "TimeoutError",
        );
      }
      throw error;
    }
  }

  return response;
}
