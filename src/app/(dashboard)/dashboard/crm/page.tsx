'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import CRMColumn from '@/components/dashboard/CRMColumn';
import ContactForm from '@/components/dashboard/ContactForm';
import { crmStages } from '@/lib/theme-maps';
import type { Contact } from '@/lib/types';

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Contact form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<string>('lead');
  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || data || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Filter contacts by search
  const filteredContacts = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  });

  // Group by stage
  const grouped = crmStages.map((stage) => ({
    stage,
    contacts: filteredContacts.filter((c) => c.status === stage.id),
  }));

  // Total pipeline value
  const totalPipelineValue = filteredContacts.reduce(
    (sum, c) => sum + (c.value || 0),
    0
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleContactClick = (contact: Contact) => {
    setEditingContact(contact);
    setFormOpen(true);
  };

  const handleAddClick = (stageId?: string) => {
    setEditingContact(null);
    setDefaultStatus(stageId || 'lead');
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchContacts();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Pipeline CRM
          </h2>
          <p className="text-white/40 mt-1 text-sm">
            {filteredContacts.length} contactos &middot; Valor total:{' '}
            <span className="text-green-400/80 font-semibold">
              {formatCurrency(totalPipelineValue)}
            </span>
          </p>
        </div>
        <Button
          onClick={() => handleAddClick()}
          className="bg-brand hover:bg-brand-dark text-white gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nuevo Contacto
        </Button>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contactos..."
            className="pl-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:border-brand focus-visible:ring-brand/30 h-9"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
          {crmStages.map((stage) => (
            <div
              key={stage.id}
              className="flex flex-col w-[300px] min-w-[300px] shrink-0"
            >
              {/* Skeleton header */}
              <div className="mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-2.5 h-2.5 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
              </div>
              {/* Skeleton cards */}
              <div className="space-y-2.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-[#15151c] border border-white/[0.06] rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Kanban Board - horizontal scroll */
        <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
          {grouped.map(({ stage, contacts: stageContacts }) => (
            <CRMColumn
              key={stage.id}
              stage={stage}
              contacts={stageContacts}
              onContactClick={handleContactClick}
              onAddClick={() => handleAddClick(stage.id)}
            />
          ))}
        </div>
      )}

      {/* Contact Form Dialog */}
      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editingContact}
        defaultStatus={defaultStatus}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
