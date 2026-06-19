'use client';
import { useEffect } from 'react';

export default function BillingCleanup() {
  useEffect(() => {
    // Al montar: fondo claro
    document.documentElement.style.background = '#F6F7FB';
    document.body.style.background = '#F6F7FB';
    document.body.style.overflow = '';

    return () => {
      // Al desmontar (navegar fuera): restaurar oscuro INMEDIATAMENTE
      document.documentElement.style.background = '#07070A';
      document.body.style.background = '#07070A';
      document.documentElement.removeAttribute('data-billing');
      // Limpiar después de transición
      setTimeout(() => {
        if (!document.documentElement.hasAttribute('data-billing')) {
          document.documentElement.style.removeProperty('background');
          document.body.style.removeProperty('background');
        }
      }, 300);
    };
  }, []);

  return null;
}
