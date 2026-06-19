'use client';
import { useEffect } from 'react';

export default function BillingCleanup() {
  useEffect(() => {
    // Al montar billing: fondo claro
    document.documentElement.style.setProperty('background', '#F6F7FB', 'important');
    document.body.style.setProperty('background', '#F6F7FB', 'important');
    document.documentElement.setAttribute('data-page', 'billing');

    return () => {
      // Al desmontar: restaurar oscuro INMEDIATAMENTE y con !important
      document.documentElement.removeAttribute('data-page');
      document.documentElement.style.setProperty('background', '#07070A', 'important');
      document.body.style.setProperty('background', '#07070A', 'important');
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      
      // Después de la transición CSS, quitar los estilos inline
      // para que el CSS normal tome control
      const timer = setTimeout(() => {
        if (document.documentElement.getAttribute('data-page') !== 'billing') {
          document.documentElement.style.removeProperty('background');
          document.body.style.removeProperty('background');
        }
      }, 100);
      return () => clearTimeout(timer);
    };
  }, []);

  return null;
}
