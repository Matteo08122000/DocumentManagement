import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText: string;
    try {
      // Prova a interpretare la risposta come JSON
      const errorData = await res.json();
      errorText = errorData.error || res.statusText;
    } catch (e) {
      // Se non è JSON, usa il testo grezzo o lo statusText
      try {
        errorText = (await res.text()) || res.statusText;
      } catch (e2) {
        errorText = res.statusText;
      }
    }
    throw new Error(`${res.status}: ${errorText}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Verifica se la risposta del server è HTML e non JSON
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("text/html")) {
    throw new Error("Errore del server: risposta HTML anziché JSON.");
  }

  await throwIfResNotOk(res);

  try {
    return (await res.json()) as T;
  } catch (e) {
    if (res.status === 204) {
      return {} as T;
    }
    throw new Error(
      "Risposta non valida: impossibile processare i dati ricevuti",
    );
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);

    // Gestiamo il caso in cui la risposta non contenga JSON
    try {
      return await res.json();
    } catch (e) {
      if (res.status === 204) {
        // 204 No Content - è una risposta valida ma vuota
        return {} as T;
      }
      throw new Error(
        "Risposta non valida: impossibile processare i dati ricevuti",
      );
    }
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
