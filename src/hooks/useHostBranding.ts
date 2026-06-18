'use client';
import { useState, useEffect } from 'react';

interface HostBranding {
  isBoost: boolean;
  isWeeklink: boolean;
  name: string;
  color: string;
  logo: string | null;
  backHref: string;
}

export function useHostBranding(): HostBranding {
  const [host, setHost] = useState('');
  const [boostLogo, setBoostLogo] = useState<string | null>(null);

  useEffect(() => {
    setHost(window.location.hostname);
  }, []);

  // Intentar cargar logo del CMS si es Boost
  useEffect(() => {
    if (!host.includes('boostmarketing') && !host.includes('boost-marketing')) return;
    fetch('/api/branding/public')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.logoUrl) setBoostLogo(d.logoUrl); })
      .catch(() => {});
  }, [host]);

  const isBoost = host.includes('boostmarketing') || host.includes('boost-marketing');

  if (isBoost) {
    return {
      isBoost: true,
      isWeeklink: false,
      name: 'BoostMarketing',
      color: '#7C3AED',
      logo: boostLogo,
      backHref: '/',
    };
  }

  return {
    isBoost: false,
    isWeeklink: true,
    name: 'Weeklink',
    color: '#7C3AED',
    logo: null,
    backHref: '/weeklink',
  };
}
