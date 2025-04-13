// src/lib/queryClient.ts
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext"; // importa il context se serve nel client

// ✅ Funzione per lanciare errore se la response non è OK
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText: string;
    try {
      const errorData = await res.json();
      errorText = errorData.error || res.statusText;
    } catch {
      try {
        errorText = (await res.text()) || res.statusText;
      } catch {
        errorText = res.statusText;
      }
    }
    throw new Error(`${res.status}: ${errorText}`);
  }
}

// ✅ Sanifica l’input per evitare problemi di sicurezza (es. injection)
function sanitizeInput(data: any): any {
  if (typeof data === "string") {
    return data.replace(/['";\\]/g, "");
  } else if (Array.isArray(data)) {
    return data.map((item) => sanitizeInput(item));
  } else if (data !== null && typeof data === "object") {
    const sanitized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitized[key] = sanitizeInput(data[key]);
      }
    }
    return sanitized;
  }
  return data;
}

// ✅ Funzione generica per qualsiasi fetch: GET, POST, PUT, DELETE
export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown,
  csrfToken?: string
): Promise<T> {
  const sanitizedData = data ? sanitizeInput(data) : undefined;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };

  if (csrfToken && ["POST", "PUT", "DELETE"].includes(method.toUpperCase())) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: sanitizedData ? JSON.stringify(sanitizedData) : undefined,
    credentials: "include",
  });

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("text/html")) {
    throw new Error("Errore del server: risposta HTML anziché JSON.");
  }

  await throwIfResNotOk(res);

  try {
    return await res.json();
  } catch (e) {
    if (res.status === 204) return {} as T;
    throw new Error("Risposta non valida: impossibile processare i dati");
  }
}

// ✅ Funzione di default da usare nei useQuery se non passi una queryFn personalizzata
type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn = <T>(options: {
  on401: UnauthorizedBehavior;
  getCsrfToken: () => string | null;
}): QueryFunction<T> => {
  const { on401, getCsrfToken } = options;

  return async ({ queryKey }) => {
    const url = queryKey[0] as string;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const csrfToken = getCsrfToken();
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers,
    });

    if (on401 === "returnNull" && res.status === 401) {
      return null as T;
    }

    await throwIfResNotOk(res);

    try {
      return await res.json();
    } catch (e) {
      if (res.status === 204) return {} as T;
      throw new Error(
        "Risposta non valida: impossibile processare i dati ricevuti"
      );
    }
  };
};

// ✅ Istanzia il QueryClient con il CSRF token corrente
export const createQueryClient = (getCsrfToken: () => string | null) => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: getQueryFn({ on401: "throw", getCsrfToken }),
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
};

// ✅ Utility per invalidare la cache di tutti i documenti
export const invalidateDocumentsCache = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
  queryClient.invalidateQueries({ queryKey: ["/api/documents/obsolete"] });
  queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
};
