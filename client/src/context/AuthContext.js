import React, { createContext, useState, useContext, useEffect } from 'react';
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    // Check for existing token on app load
    const token = localStorage.getItem('token');
    if (token) {
      // In a real app, you'd validate the token with your backend
      // For this example, we'll just check if a token exists
      // You might want to add more robust token validation
      setUser({ token, role: localStorage.getItem('userRole') });
    }
  }, []);
  const login = (userData) => {
    setUser({
      token: userData.token,
      role: userData.role
    });
    localStorage.setItem('token', userData.token);
    localStorage.setItem('userRole', userData.role);
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
  };
  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);