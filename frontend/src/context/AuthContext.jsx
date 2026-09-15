import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [user, setUser] = useState(null); // { role: 'admin' | 'user' }

  const login = (jwtToken, userData) => {
    localStorage.setItem("token", jwtToken);
    setToken(jwtToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setWalletAddress(null);
  };

  const connectWallet = (address) => {
    setWalletAddress(address);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        walletAddress,
        login,
        logout,
        connectWallet,
        isAuthenticated: !!token || !!walletAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);