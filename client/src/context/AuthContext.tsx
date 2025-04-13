import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  ReactElement,
} from "react";

interface AuthContextType {
  user: any;
  csrfToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}): ReactElement => {
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/csrf-token`,
          {
            credentials: "include",
          }
        );
        const data = await res.json();
        setCsrfToken(data.csrfToken);

        const userRes = await fetch(
          `${import.meta.env.VITE_API_URL}/api/auth/current-user`,
          {
            credentials: "include",
          }
        );
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        }
      } catch (err) {
        console.error("Errore AuthProvider:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Login fallito");
    }

    const userData = await res.json();
    setUser(userData.user);

    await fetch(`${import.meta.env.VITE_API_URL}/api/csrf-token`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrfToken));
  };

  const logout = async () => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken || "",
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, csrfToken, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve essere usato dentro <AuthProvider>");
  return ctx;
};
