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

async function handleUnauthorized(res: Response, url: string, options: RequestInit): Promise<Response | null> {
  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry the original request with the refreshed session
      return fetch(url, options);
    }
    window.dispatchEvent(new CustomEvent("auth:expired"));
    return null;
  }
  if (res.status === 409) {
    // Server refreshed the token — retry the original request
    return fetch(url, options);
  }
  return null;
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

  let res = await fetch(fullUrl, options);

  if (res.status === 401 || res.status === 409) {
    const retried = await handleUnauthorized(res, fullUrl, options);
    if (retried) res = retried;
  }

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

    let res = await fetch(fullUrl, options);

    if (res.status === 401 || res.status === 409) {
      const retried = await handleUnauthorized(res, fullUrl, options);
      if (retried) res = retried;
    }

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
