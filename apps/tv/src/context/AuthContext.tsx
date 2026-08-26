import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfileDto } from '@anivora/types';
import { api } from '../services/api';

const TOKEN_KEY = '@anivora_auth_token';
const USER_KEY = '@anivora_auth_user';

interface AuthContextType {
  token: string | null;
  user: UserProfileDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: UserProfileDto) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          const parsedUser: UserProfileDto = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          api.setToken(storedToken);
        }
      } catch (err) {
        console.error('Failed to load auth session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = useCallback(async (newToken: string, newUser: UserProfileDto) => {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      api.setToken(newToken);
    } catch (err) {
      console.error('Failed to save session:', err);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
      api.setToken(null);
    } catch (err) {
      console.error('Failed to clear session:', err);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
