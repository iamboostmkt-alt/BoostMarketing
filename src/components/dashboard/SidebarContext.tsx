'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Inicializar collapsed desde localStorage solo en desktop
  const [collapsed, setCollapsedState] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // Leer preferencia guardada al montar (solo desktop)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768) return; // en móvil siempre expandido
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') setCollapsedState(true);
  }, []);

  const setCollapsed = useCallback((val: boolean) => {
    setCollapsedState(val);
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      localStorage.setItem('sidebar-collapsed', String(val));
    }
  }, []);

  return (
    <SidebarContext.Provider
      value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen, commandOpen, setCommandOpen }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within SidebarProvider');
  return context;
}
