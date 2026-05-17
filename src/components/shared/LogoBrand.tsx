'use client';
import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

interface LogoBrandProps {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export function LogoBrand({ size = 'md', showName = true }: LogoBrandProps) {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [agencyName, setAgencyName] = useState('BoostMarketing');

  useEffect(() => {
    fetch('/api/cms/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings?.logoUrl) setLogoUrl(d.settings.logoUrl);
        if (d.settings?.agencyName) setAgencyName(d.settings.agencyName);
      })
      .catch(() => {});
  }, []);

  const sizeMap = {
    sm: { box: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4', text: 'text-base' },
    md: { box: 'w-9 h-9 rounded-lg', icon: 'w-5 h-5', text: 'text-lg' },
    lg: { box: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5', text: 'text-xl' },
  };
  const s = sizeMap[size];

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center justify-center ${s.box} bg-brand text-white shrink-0 overflow-hidden`}>
        {logoUrl ? (
          <img src={logoUrl} alt={agencyName} className="w-3/4 h-3/4 object-contain" />
        ) : (
          <Zap className={s.icon} />
        )}
      </div>
      {showName && (
        <span className={`font-bold text-white ${s.text}`}>{agencyName}</span>
      )}
    </div>
  );
}
