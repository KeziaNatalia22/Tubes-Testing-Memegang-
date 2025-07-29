import React, { createContext, useState, useContext, useEffect } from 'react';
import { fetchEndpoint } from '../FetchEndpoint'; // Adjust the import path as necessary

// Add user profile info to the context
interface UserData {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  name?: string;
  role?: 'user' | 'admin';
}

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  token: string | null;
  userData: UserData | null;
  refreshUserData: () => Promise<void>;
  isLoading: boolean; // <-- add this
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // <-- add this

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
      fetchUserData(storedToken).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserData = async (authToken: string) => {
    try {
      setIsLoading(true); // <-- set loading true when fetching
      const response = await fetchEndpoint('/profile/me', 'GET', authToken);
      if (response) {
        setUserData(response);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setIsLoading(false); // <-- set loading false after fetching
    }
  };

  const refreshUserData = async () => {
    if (token) {
      await fetchUserData(token);
    }
  };

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    fetchUserData(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
    setUserData(null);
  };

  if (isLoading) {
    // You can return a loading spinner or null here
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      login,
      logout,
      token,
      userData,
      refreshUserData,
      isLoading // <-- provide isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};