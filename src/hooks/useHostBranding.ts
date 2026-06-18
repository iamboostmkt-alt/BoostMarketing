'use client';
import { useState, useEffect } from 'react';

interface HostBranding {
  isBoost: boolean;    // true = boostmarketingboost.com
  isWeeklink: boolean; // true = weeklink.com.mx
  name: string;
  color: string;
  logo: string | null;
  loginBg: string;
}

export function useHostBranding(): HostBranding {
  const [host, setHost] = useState('');

  useEffect(() => {
    setHost(window.location.hostname);
  }, []);

  const isBoost = host.includes('boostmarketing') || host.includes('boost-marketing');
  const isWeeklink = host.includes('weeklink') || host === 'localhost';

  if (isBoost) {
    return {
      isBoost: true,
      isWeeklink: false,
      name: 'BoostMarketing',
      color: '#7C3AED',
      logo: null, // puede poner URL del logo de boost aquí
      loginBg: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #0a0a0a 100%)',
    };
  }

  // Default: Weeklink
  return {
    isBoost: false,
    isWeeklink: true,
    name: 'Weeklink',
    color: '#7C3AED',
    logo: null,
    loginBg: 'linear-gradient(135deg, #07070A 0%, #160528 50%, #07070A 100%)',
  };
}
