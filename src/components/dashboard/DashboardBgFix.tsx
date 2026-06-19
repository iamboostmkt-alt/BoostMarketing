'use client';
import { useEffect } from 'react';

// Restaura el fondo oscuro al montar el dashboard
// Necesario después de navegar desde /billing que pone fondo claro
export default function DashboardBgFix() {
  useEffect(() => {
    document.documentElement.removeAttribute('data-page');
    document.documentElement.style.setProperty('background', '#07070A', 'important');
    document.body.style.setProperty('background', '#07070A', 'important');
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    
    const timer = setTimeout(() => {
      document.documentElement.style.removeProperty('background');
      document.body.style.removeProperty('background');
    }, 200);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
