import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, 
  ProfileWithTargets, 
  Sex, 
  ActivityLevel, 
  Goal, 
  registerApi, 
  loginApi, 
  getMeApi, 
  getProfileApi, 
  updateProfileApi 
} from '../services/api';

const TOKEN_KEY = 'calorietrack_token';

interface AuthContextType {
  user: User | null;
  token: string | null;
  profileData: ProfileWithTargets | null;
  hasProfile: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
  saveProfile: (data: {
    age: number;
    sex: Sex;
    heightCm: number;
    weightKg: number;
    activityLevel: ActivityLevel;
    goal: Goal;
  }) => Promise<ProfileWithTargets>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [profileData, setProfileData] = useState<ProfileWithTargets | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setProfileData(null);
    setError(null);
  }, []);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      const data = await getProfileApi(token);
      setProfileData(data);
    } catch (err) {
      console.warn('Failed to refresh profile:', err);
    }
  }, [token]);

  // Hydrate auth & profile state on initial mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await getMeApi(storedToken);
        setUser(currentUser);
        setToken(storedToken);

        // Fetch profile data
        try {
          const userProfile = await getProfileApi(storedToken);
          setProfileData(userProfile);
        } catch (profileErr) {
          console.warn('No existing profile or error fetching profile:', profileErr);
          setProfileData(null);
        }
      } catch (err) {
        console.warn('Session expired or invalid token:', err);
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setProfileData(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await loginApi({ email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);

      // Fetch user profile on login
      try {
        const userProfile = await getProfileApi(data.token);
        setProfileData(userProfile);
      } catch {
        setProfileData(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await registerApi({ name, email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      setProfileData(null); // Fresh registration has no profile yet
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async (data: {
    age: number;
    sex: Sex;
    heightCm: number;
    weightKg: number;
    activityLevel: ActivityLevel;
    goal: Goal;
  }): Promise<ProfileWithTargets> => {
    if (!token) {
      throw new Error('Not authenticated');
    }
    setError(null);
    try {
      const updated = await updateProfileApi(token, data);
      setProfileData(updated);
      return updated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      setError(message);
      throw err;
    }
  };

  const value = {
    user,
    token,
    profileData,
    hasProfile: !!profileData?.profile,
    isAuthenticated: !!user && !!token,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    refreshProfile,
    saveProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
