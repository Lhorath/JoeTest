"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { UserProfile, UpdateUserProfileDto, ChangePasswordDto } from "@platform/types";
import { api } from "@/lib/api";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email?: string; emailOrUsername?: string; password?: string; passwordPlain?: string }) => Promise<{ success: boolean; message?: string }>;
  register: (data: {
    email: string;
    username: string;
    displayName: string;
    password: string;
    passwordConfirmation?: string;
    confirmPassword?: string;
    acceptTerms?: boolean;
    termsVersion?: string;
  }) => Promise<{ success: boolean; message?: string; user?: UserProfile }>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  confirmPasswordReset: (token: string, password: string) => Promise<{ success: boolean; message?: string }>;
  refreshUser: () => Promise<UserProfile | null>;
  refreshAuth: () => Promise<UserProfile | null>;
  updateProfile: (data: UpdateUserProfileDto) => Promise<UserProfile>;
  changePassword: (data: ChangePasswordDto) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  verifyEmail: async () => ({ success: false }),
  requestPasswordReset: async () => ({ success: false }),
  confirmPasswordReset: async () => ({ success: false }),
  refreshUser: async () => null,
  refreshAuth: async () => null,
  updateProfile: async () => ({} as UserProfile),
  changePassword: async () => ({ success: false }),
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const res = await api.auth.getMe();
      if (res && res.user) {
        setUser(res.user);
        return res.user;
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      await refreshUser();
      if (mounted) setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  const login = async (credentials: {
    email?: string;
    emailOrUsername?: string;
    password?: string;
    passwordPlain?: string;
  }) => {
    try {
      const res = await api.auth.login(credentials);
      if (res && res.success) {
        if (res.user) {
          setUser(res.user);
        } else {
          await refreshUser();
        }
        return { success: true };
      }
      return { success: false, message: "Login failed" };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to log in";
      return { success: false, message: msg };
    }
  };

  const register = async (data: {
    email: string;
    username: string;
    displayName: string;
    password: string;
    passwordConfirmation?: string;
    confirmPassword?: string;
  }) => {
    try {
      const res = await api.auth.register(data);
      if (res && res.success) {
        if (res.user) {
          setUser(res.user);
        } else {
          await refreshUser();
        }
        return { success: true, message: res.message, user: res.user };
      }
      return { success: false, message: res?.message || "Registration failed" };
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to create account";
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      const res = await api.auth.verifyEmail({ token });
      await refreshUser();
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Email verification failed";
      return { success: false, message: msg };
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const res = await api.auth.requestPasswordReset({ email });
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to request password reset";
      return { success: false, message: msg };
    }
  };

  const confirmPasswordReset = async (token: string, password: string) => {
    try {
      const res = await api.auth.confirmPasswordReset({ token, password });
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to reset password";
      return { success: false, message: msg };
    }
  };

  const updateProfile = async (data: UpdateUserProfileDto): Promise<UserProfile> => {
    const updated = await api.account.updateProfile(data);
    setUser(updated);
    return updated;
  };

  const changePassword = async (data: ChangePasswordDto) => {
    try {
      return await api.account.changePassword(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to change password";
      return { success: false, message: msg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        verifyEmail,
        requestPasswordReset,
        confirmPasswordReset,
        refreshUser,
        refreshAuth: refreshUser,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
