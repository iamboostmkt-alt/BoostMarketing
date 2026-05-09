'use client';

import { motion } from 'framer-motion';
import { Building2, Mail, DollarSign } from 'lucide-react';
import { statusColors, statusLabels } from '@/lib/theme-maps';
import type { Contact } from '@/lib/types';

interface ContactCardProps {
  contact: Contact;
  onClick: (contact: Contact) => void;
  index?: number;
}

export default function ContactCard({ contact, onClick, index = 0 }: ContactCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
      onClick={() => onClick(contact)}
      className="
        cursor-grab active:cursor-grabbing
        bg-[#15151c] border border-white/[0.06] rounded-xl p-4
        hover:border-white/[0.12] hover:shadow-[0_0_20px_rgba(124,58,237,0.08)]
        transition-all duration-200 group
      "
    >
      {/* Name + Status Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-white/90 truncate leading-tight">
          {contact.name}
        </h4>
        <span
          className={`inline-flex items-center shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            statusColors[contact.status] || 'status-lead'
          }`}
        >
          {statusLabels[contact.status] || contact.status}
        </span>
      </div>

      {/* Company */}
      {contact.company && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Building2 className="w-3.5 h-3.5 text-white/30 shrink-0" />
          <span className="text-xs text-white/40 truncate">{contact.company}</span>
        </div>
      )}

      {/* Email */}
      <div className="flex items-center gap-1.5 mb-2">
        <Mail className="w-3.5 h-3.5 text-white/30 shrink-0" />
        <span className="text-xs text-white/40 truncate">{contact.email}</span>
      </div>

      {/* Deal Value */}
      {contact.value > 0 && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.04]">
          <DollarSign className="w-3.5 h-3.5 text-green-400/60 shrink-0" />
          <span className="text-xs font-semibold text-green-400/80">
            {formatCurrency(contact.value)}
          </span>
        </div>
      )}
    </motion.div>
  );
}
