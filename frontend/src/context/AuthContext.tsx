import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  User, 
  ProfileWithTargets, 
  Sex, 
  ActivityLevel, 
  Goal, 
  SessionInfo,
  registerApi, 
  loginApi, 
  googleAuthApi,
  refreshTokenApi,
  logoutApi,
  logoutAllApi,
  getSessionsApi,
  revokeSessionApi,
  getProfileApi, 
  updateProfileApi,
  registerAuthCallbacks
} from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  profileData: ProfileWithTargets | null;
  hasProfile: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessions: SessionInfo[];
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  saveProfile: (data: {
    age: number;
    sex: Sex;
    heightCm: number;
    weightKg: number;
    targetWeightKg?: number | null;
    activityLevel: ActivityLevel;
    goal: Goal;
  }) => Promise<ProfileWithTargets>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // In-memory access token storage (NEVER in localStorage)
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileWithTargets | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Single-flight refresh token mutex
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const clearError = useCallback(() => {
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

  const refreshSessions = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      const list = await getSessionsApi(token);
      setSessions(list);
    } catch (err) {
      console.warn('Failed to fetch sessions:', err);
    }
  }, [token]);

  /**
   * Single-flight silent session restoration
   */
  const silentRefresh = useCallback(async (): Promise<string | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const data = await refreshTokenApi();
        const newAccessToken = data.accessToken || data.token || null;
        setToken(newAccessToken);
        setUser(data.user);

        // Hydrate profile data
        if (newAccessToken) {
          try {
            const userProfile = await getProfileApi(newAccessToken);
            setProfileData(userProfile);
          } catch {
            setProfileData(null);
          }
        }
        return newAccessToken;
      } catch (err) {
        setToken(null);
        setUser(null);
        setProfileData(null);
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, []);

  // Register global single-flight callbacks
  useEffect(() => {
    registerAuthCallbacks({
      onTokenUpdated: (newToken: string) => {
        setToken(newToken);
      },
      onSessionExpired: () => {
        setToken(null);
        setUser(null);
        setProfileData(null);
        setSessions([]);
      },
    });
  }, []);

  // Hydrate auth & profile state on initial app load via HttpOnly refresh cookie
  useEffect(() => {
    const initAuth = async () => {
      try {
        await silentRefresh();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [silentRefresh]);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await loginApi({ email, password });
      const newAccessToken = data.accessToken || data.token || null;
      setToken(newAccessToken);
      setUser(data.user);

      // Fetch user profile on login
      if (newAccessToken) {
        try {
          const userProfile = await getProfileApi(newAccessToken);
          setProfileData(userProfile);
        } catch {
          setProfileData(null);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (idToken: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      if (import.meta.env.DEV) {
        console.log('[GoogleAuth Frontend DEBUG] AuthContext.loginWithGoogle initiated.');
      }
      const data = await googleAuthApi({ idToken });
      const newAccessToken = data.accessToken || data.token || null;
      setToken(newAccessToken);
      setUser(data.user);

      if (import.meta.env.DEV) {
        console.log('[GoogleAuth Frontend DEBUG] Authenticated user received:', data.user.email);
      }

      // Hydrate profile data for Google authenticated user
      if (newAccessToken) {
        try {
          const userProfile = await getProfileApi(newAccessToken);
          setProfileData(userProfile);
        } catch {
          setProfileData(null);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google authentication failed';
      if (import.meta.env.DEV) {
        console.error('[GoogleAuth Frontend DEBUG] AuthContext.loginWithGoogle error:', message);
      }
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
      const newAccessToken = data.accessToken || data.token || null;
      setToken(newAccessToken);
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

  const logout = async (): Promise<void> => {
    try {
      await logoutApi();
    } finally {
      setToken(null);
      setUser(null);
      setProfileData(null);
      setSessions([]);
      setError(null);
    }
  };

  const logoutAll = async (): Promise<void> => {
    if (!token) return;
    try {
      await logoutAllApi(token);
    } finally {
      setToken(null);
      setUser(null);
      setProfileData(null);
      setSessions([]);
      setError(null);
    }
  };

  const revokeSession = async (sessionIdToRevoke: string): Promise<void> => {
    if (!token) return;
    await revokeSessionApi(token, sessionIdToRevoke);
    await refreshSessions();
  };

  const saveProfile = async (data: {
    age: number;
    sex: Sex;
    heightCm: number;
    weightKg: number;
    targetWeightKg?: number | null;
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
    sessions,
    login,
    loginWithGoogle,
    register,
    logout,
    logoutAll,
    clearError,
    refreshProfile,
    refreshSessions,
    revokeSession,
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
