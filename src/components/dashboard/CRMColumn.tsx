'use client';

import { Plus, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ContactCard from './ContactCard';
import { crmStages } from '@/lib/theme-maps';
import type { Contact } from '@/lib/types';

interface CRMColumnProps {
  stage: (typeof crmStages)[number];
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
  onAddClick: () => void;
}

export default function CRMColumn({
  stage,
  contacts,
  onContactClick,
  onAddClick,
}: CRMColumnProps) {
  const totalValue = contacts.reduce((sum, c) => sum + (c.value || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex flex-col w-[300px] min-w-[300px] md:w-[280px] md:min-w-[280px] lg:w-[300px] lg:min-w-[300px] shrink-0">
      {/* Column Header */}
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
            <h3 className="text-sm font-semibold text-white/90">{stage.label}</h3>
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/[0.06] text-[10px] font-medium text-white/50">
              {contacts.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onAddClick}
            className="h-7 w-7 text-white/30 hover:text-white hover:bg-[var(--wl-hover)]"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {totalValue > 0 && (
          <p className="text-[11px] text-white/30 pl-[18px]">
            Total: {formatCurrency(totalValue)}
          </p>
        )}
      </div>

      {/* Scrollable Card List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2.5 max-h-[calc(100vh-220px)]">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-[var(--wl-border)] rounded-xl">
            <Inbox className="w-8 h-8 text-white/10 mb-2" />
            <p className="text-xs text-white/25">
              No hay contactos en esta etapa
            </p>
          </div>
        ) : (
          contacts.map((contact, idx) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onClick={onContactClick}
              index={idx}
            />
          ))
        )}
      </div>
    </div>
  );
}
