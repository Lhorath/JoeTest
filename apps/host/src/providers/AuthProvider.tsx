"use client";

import * as React from "react";
import { createApiClient } from "@platform/api-client";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  accountStatus: string;
  emailVerified: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isHost: boolean;
  login: (emailOrUsername: string, passwordPlain: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const apiClient = React.useMemo(() => createApiClient(), []);

  const refreshUser = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.auth.getMe();
      if (res?.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  React.useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (emailOrUsername: string, passwordPlain: string) => {
    await apiClient.auth.login({ emailOrUsername, passwordPlain });
    await refreshUser();
  };

  const logout = async () => {
    try {
      await apiClient.auth.logout();
    } finally {
      setUser(null);
    }
  };

  const isHost = React.useMemo(() => {
    if (!user) return false;
    return (
      user.roles.includes("HOST") ||
      user.roles.includes("OWNER_ADMIN") ||
      user.roles.includes("MODERATOR")
    );
  }, [user]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isHost,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
