import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const API_BASE = import.meta.env.VITE_API_URL || "";

// Deduplicate concurrent refresh attempts
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(API_BASE + "/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

/**
 * Fetch wrapper that handles 409 (token refreshed, retry) and 401 (session expired).
 * Use this instead of raw fetch() for any authenticated API call.
 */
export async function fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
  const opts = { ...options, credentials: options.credentials || ("include" as RequestCredentials) };
  let response = await fetch(url, opts);

  if (response.status === 409) {
    const data = await response.clone().json().catch(() => ({}));
    if (data.retryable) {
      console.log('[fetchWithRetry] 409 received, waiting 1000ms then retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      response = await fetch(url, opts);
    }
  }

  // 401 = token expired, try client-side refresh then retry
  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await fetch(url, opts);
    } else {
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
  }

  return response;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = API_BASE + url;
  const options: RequestInit = {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  };

  const res = await fetchWithRetry(fullUrl, options);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const fullUrl = API_BASE + (queryKey.join("/") as string);
    const options: RequestInit = { credentials: "include" };

    const res = await fetchWithRetry(fullUrl, options);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
