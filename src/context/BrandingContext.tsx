'use client';
import { createContext, useContext, useEffect, useState } from 'react';

interface BrandingContextValue {
  logoUrl:    string;
  agencyName: string;
}

const BrandingContext = createContext<BrandingContextValue>({
  logoUrl:    '',
  agencyName: 'BoostMarketing',
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl,    setLogoUrl]    = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('brand_logoUrl') || '';
    }
    return '';
  });
  const [agencyName, setAgencyName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('brand_agencyName') || 'BoostMarketing';
    }
    return 'BoostMarketing';
  });

  useEffect(() => {
    fetch('/api/cms/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings?.logoUrl)    { setLogoUrl(d.settings.logoUrl);       localStorage.setItem('brand_logoUrl',    d.settings.logoUrl); }
        if (d.settings?.agencyName) { setAgencyName(d.settings.agencyName); localStorage.setItem('brand_agencyName', d.settings.agencyName); }
      })
      .catch(() => {});
  }, []);

  return (
    <BrandingContext.Provider value={{ logoUrl, agencyName }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
