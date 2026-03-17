import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { disconnectSocket } from '../lib/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lc_token');
    if (token) {
      api.me().then(u => { setUser(u); setLoading(false); })
        .catch(() => { localStorage.removeItem('lc_token'); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email, password) {
    const { token, user } = await api.login({ email, password });
    localStorage.setItem('lc_token', token);
    setUser(user);
    return user;
  }

  async function register(data) {
    const { token, user } = await api.register(data);
    localStorage.setItem('lc_token', token);
    setUser(user);
    return user;
  }

  function logout() {
    localStorage.removeItem('lc_token');
    disconnectSocket();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
