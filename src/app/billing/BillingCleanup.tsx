'use client';
import { useEffect } from 'react';

export default function BillingCleanup() {
  useEffect(() => {
    document.documentElement.style.setProperty('background', '#F6F7FB', 'important');
    document.body.style.setProperty('background', '#F6F7FB', 'important');
    document.documentElement.setAttribute('data-page', 'billing');

    return () => {
      document.documentElement.removeAttribute('data-page');
      document.documentElement.style.setProperty('background', '#07070A', 'important');
      document.body.style.setProperty('background', '#07070A', 'important');
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      setTimeout(() => {
        if (document.documentElement.getAttribute('data-page') !== 'billing') {
          document.documentElement.style.removeProperty('background');
          document.body.style.removeProperty('background');
        }
      }, 100);
    };
  }, []);

  return null;
}
