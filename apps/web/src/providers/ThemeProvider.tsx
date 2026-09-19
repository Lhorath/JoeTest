"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { PublicThemeConfig, ThemeTokens } from "@platform/types";
import { api } from "@/lib/api";

const DEFAULT_THEME_TOKENS: ThemeTokens = {
  primaryColor: "#8B5CF6",
  primaryHoverColor: "#7C3AED",
  secondaryColor: "#27272A",
  accentColor: "#A78BFA",
  backgroundColor: "#09090B",
  surfaceColor: "#18181B",
  textColor: "#FAFAFA",
  mutedTextColor: "#A1A1AA",
  borderColor: "#27272A",
  liveColor: "#EF4444",
  successColor: "#22C55E",
  warningColor: "#F59E0B",
  dangerColor: "#EF4444",
};

interface ThemeContextType {
  siteName: string;
  primaryLogoUrl: string | null;
  alternateLogoUrl: string | null;
  faviconUrl: string | null;
  tokens: ThemeTokens;
  isLoading: boolean;
  refreshTheme: () => Promise<void>;
  applyPreviewTokens: (tokens: Partial<ThemeTokens>) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  siteName: "TheQueue",
  primaryLogoUrl: null,
  alternateLogoUrl: null,
  faviconUrl: null,
  tokens: DEFAULT_THEME_TOKENS,
  isLoading: false,
  refreshTheme: async () => {},
  applyPreviewTokens: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeConfig, setThemeConfig] = useState<PublicThemeConfig>({
    siteName: "TheQueue",
    primaryLogoUrl: null,
    alternateLogoUrl: null,
    faviconUrl: null,
    tokens: DEFAULT_THEME_TOKENS,
    updatedAt: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);

  const applyCssVariables = (tokens: ThemeTokens) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--color-brand-primary", tokens.primaryColor);
    root.style.setProperty("--color-brand-primary-hover", tokens.primaryHoverColor);
    root.style.setProperty("--color-brand-secondary", tokens.secondaryColor);
    root.style.setProperty("--color-brand-accent", tokens.accentColor);
    root.style.setProperty("--color-brand-background", tokens.backgroundColor);
    root.style.setProperty("--color-brand-surface", tokens.surfaceColor);
    root.style.setProperty("--color-brand-text", tokens.textColor);
    root.style.setProperty("--color-brand-muted", tokens.mutedTextColor);
    root.style.setProperty("--color-brand-border", tokens.borderColor);
    root.style.setProperty("--color-brand-live", tokens.liveColor);
    root.style.setProperty("--color-brand-success", tokens.successColor);
    root.style.setProperty("--color-brand-warning", tokens.warningColor);
    root.style.setProperty("--color-brand-danger", tokens.dangerColor);

    // Also update core UI variables so standard buttons/cards inherit live customizations
    root.style.setProperty("--color-primary", tokens.primaryColor);
    root.style.setProperty("--color-primary-hover", tokens.primaryHoverColor);
    root.style.setProperty("--color-secondary", tokens.secondaryColor);
    root.style.setProperty("--color-background", tokens.backgroundColor);
    root.style.setProperty("--color-foreground", tokens.textColor);
    root.style.setProperty("--color-card", tokens.surfaceColor);
    root.style.setProperty("--color-card-border", tokens.borderColor);
  };

  const fetchTheme = async () => {
    try {
      setIsLoading(true);
      const res = await api.theme.getPublic();
      if (res && res.tokens) {
        setThemeConfig(res);
        applyCssVariables(res.tokens);

        // Update favicon if provided
        if (res.faviconUrl) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.getElementsByTagName("head")[0].appendChild(link);
          }
          link.href = res.faviconUrl;
        }
      }
    } catch (err) {
      console.warn("Could not load public theme config, using defaults:", err);
      applyCssVariables(DEFAULT_THEME_TOKENS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTheme();
  }, []);

  const applyPreviewTokens = (preview: Partial<ThemeTokens>) => {
    const merged = { ...themeConfig.tokens, ...preview };
    applyCssVariables(merged);
  };

  return (
    <ThemeContext.Provider
      value={{
        siteName: themeConfig.siteName,
        primaryLogoUrl: themeConfig.primaryLogoUrl,
        alternateLogoUrl: themeConfig.alternateLogoUrl,
        faviconUrl: themeConfig.faviconUrl,
        tokens: themeConfig.tokens,
        isLoading,
        refreshTheme: fetchTheme,
        applyPreviewTokens,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
