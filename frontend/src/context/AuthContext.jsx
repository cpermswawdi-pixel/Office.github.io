import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    try { if (localStorage.getItem("wms-token")) await api.post("/auth/logout"); }
    finally {
      localStorage.removeItem("wms-token");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const onUnauthorized = () => { localStorage.removeItem("wms-token"); setUser(null); };
    window.addEventListener("wms:unauthorized", onUnauthorized);
    const token = localStorage.getItem("wms-token");
    if (!token) { setLoading(false); return () => window.removeEventListener("wms:unauthorized", onUnauthorized); }
    api.get("/auth/me")
      .then(({ data }) => setUser(data.data))
      .catch(() => { localStorage.removeItem("wms-token"); })
      .finally(() => setLoading(false));
    return () => window.removeEventListener("wms:unauthorized", onUnauthorized);
  }, []);

  const signIn = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("wms-token", data.data.token);
    setUser(data.data.user);
  };
  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
