import React, { createContext, useContext, useEffect, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';

interface ThemeConfig {
  '--color-brand-primary'?: string;
  '--color-brand-primary-light'?: string;
  '--color-brand-primary-dark'?: string;
  '--color-brand-accent'?: string;
  '--font-family-serif'?: string;
  '--font-family-sans'?: string;
}

const ThemeContext = createContext<ThemeConfig | null>(null);

export const TenantThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const [theme, setTheme] = useState<ThemeConfig | null>(null);

  useEffect(() => {
    async function loadTenantTheme() {
      if (!slug) return;
      
      const { data: tenant } = await supabase
        .from('tenants')
        .select('settings')
        .eq('slug', slug)
        .single();

      if (tenant?.settings?.theme) {
        setTheme(tenant.settings.theme);
      } else {
        setTheme(null); // Reset to defaults
      }
    }
    loadTenantTheme();
  }, [slug]);

  useEffect(() => {
    if (!theme) return;

    // Dynamically inject CSS variables into the document root
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      if (value) root.style.setProperty(key, value);
    });

    // Cleanup: remove properties if theme changes (for demo purposes)
    return () => {
      Object.keys(theme).forEach((key) => {
        root.style.removeProperty(key);
      });
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTenantTheme = () => useContext(ThemeContext);
