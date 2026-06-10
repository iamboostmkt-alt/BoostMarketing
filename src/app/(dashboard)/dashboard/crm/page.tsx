'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Search, Users, UserCheck, UserX, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import CRMColumn from '@/components/dashboard/CRMColumn';
import ContactForm from '@/components/dashboard/ContactForm';
import { crmStages, legacyStageMigration } from '@/lib/theme-maps';
import type { Contact } from '@/lib/types';

type SegmentTab = 'all' | 'prospects' | 'clients' | 'unassigned' | 'active';

const segmentTabs: { id: SegmentTab; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'all',        label: 'Todos',        icon: Users,     color: 'text-white/60'   },
  { id: 'prospects',  label: 'Prospectos',   icon: Search,    color: 'text-cyan-400'   },
  { id: 'clients',    label: 'Clientes',     icon: UserCheck, color: 'text-green-400'  },
  { id: 'active',     label: 'Activos',      icon: Zap,       color: 'text-amber-400'  },
  { id: 'unassigned', label: 'Sin asignar',  icon: UserX,     color: 'text-red-400'    },
];

/** Normalize legacy stage IDs to the new pipeline */
function normalizeStage(status: string): string {
  return legacyStageMigration[status] ?? status;
}

export default function CRMPage() {
  const [contacts,       setContacts]       = useState<Contact[]>([]);
  const [contactsCursor, setContactsCursor] = useState<string | null>(null);
  const [contactsHasMore,setContactsHasMore]= useState(false);
  const [contactsLoading,setContactsLoading]= useState(false);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [activeSegment,  setActiveSegment]  = useState<SegmentTab>('all');

  const [formOpen,        setFormOpen]       = useState(false);
  const [editingContact,  setEditingContact] = useState<Contact | null>(null);
  const [defaultStatus,   setDefaultStatus]  = useState<string>('prospect');

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch('/api/contacts?limit=50');
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || data || []);
        setContactsCursor(data.nextCursor || null);
        setContactsHasMore(data.hasMore || false);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // Segment filter
  const segmentFiltered = useMemo(() => {
    return contacts.filter((c) => {
      const stage = normalizeStage(c.status);
      switch (activeSegment) {
        case 'prospects':  return stage === 'prospect' || stage === 'lead';
        case 'clients':    return stage === 'cliente';
        case 'active':     return stage === 'activo';
        case 'unassigned': return !c.status || stage === 'prospect';
        default:           return true;
      }
    });
  }, [contacts, activeSegment]);

  // Search filter on top of segment
  async function loadMoreContacts() {
    if (!contactsCursor || contactsLoading) return;
    setContactsLoading(true);
    try {
      const res = await fetch('/api/contacts?cursor=' + contactsCursor + '&limit=50');
      if (res.ok) {
        const data = await res.json();
        setContacts((prev: any[]) => [...prev, ...(data.contacts || [])]);
        setContactsCursor(data.nextCursor || null);
        setContactsHasMore(data.hasMore || false);
      }
    } finally { setContactsLoading(false); }
  }

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return segmentFiltered;
    const q = search.toLowerCase();
    return segmentFiltered.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  }, [segmentFiltered, search]);

  // Count per segment for badges
  const counts = useMemo(() => {
    const norm = (s: string) => normalizeStage(s);
    return {
      all:        contacts.length,
      prospects:  contacts.filter((c) => { const s = norm(c.status); return s === 'prospect' || s === 'lead'; }).length,
      clients:    contacts.filter((c) => norm(c.status) === 'cliente').length,
      active:     contacts.filter((c) => norm(c.status) === 'activo').length,
      unassigned: contacts.filter((c) => !c.status || norm(c.status) === 'prospect').length,
    };
  }, [contacts]);

  // Group by stage for kanban view
  const grouped = crmStages.map((stage) => ({
    stage,
    contacts: filteredContacts.filter((c) => normalizeStage(c.status) === stage.id),
  }));

  const totalPipelineValue = filteredContacts.reduce((sum, c) => sum + (c.value || 0), 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

  const handleContactClick = (contact: Contact) => { setEditingContact(contact); setFormOpen(true); };
  const handleAddClick = (stageId?: string)      => { setEditingContact(null); setDefaultStatus(stageId || 'prospect'); setFormOpen(true); };

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Pipeline CRM</h2>
          <p className="text-white/40 mt-1 text-sm">
            {filteredContacts.length} contactos &middot; Valor:{' '}
            <span className="text-green-400/80 font-semibold">{formatCurrency(totalPipelineValue)}</span>
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

      {/* Segment tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {segmentTabs.map((tab) => {
          const Icon    = tab.icon;
          const count   = counts[tab.id];
          const isActive = activeSegment === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSegment(tab.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${
                isActive
                  ? 'bg-brand/20 border-brand/40 text-brand-light'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-light' : tab.color}`} />
              {tab.label}
              <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                isActive ? 'bg-brand/30 text-brand-light' : 'bg-white/[0.06] text-white/40'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar contactos..."
          className="pl-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:border-brand focus-visible:ring-brand/30 h-9"
        />
      </div>

      {/* Stage pipeline info */}
      <div className="flex gap-2 flex-wrap">
        {crmStages.map((stage) => (
          <div key={stage.id} className="flex items-center gap-1.5 text-[11px] text-white/40">
            <span className={`w-2 h-2 rounded-full inline-block ${stage.color === 'dot-cyan' ? 'bg-cyan-400' : stage.color === 'dot-purple' ? 'bg-purple-400' : stage.color === 'dot-green' ? 'bg-green-400' : 'bg-amber-400'}`} />
            <span>{stage.label}</span>
            <span className="text-white/25">— {stage.description}</span>
          </div>
        ))}
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
          {crmStages.map((stage) => (
            <div key={stage.id} className="flex flex-col w-[85vw] sm:w-[300px] min-w-[260px] sm:min-w-[300px] shrink-0">
              <div className="mb-3 px-1 flex items-center gap-2">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <div className="space-y-2.5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="bg-[#15151c] border border-white/[0.06] rounded-xl p-4 space-y-3">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
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

      {/* Cargar más contactos */}
      {contactsHasMore && (
        <div className="flex justify-center py-4">
          <button onClick={loadMoreContacts} disabled={contactsLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-50">
            {contactsLoading ? 'Cargando...' : 'Cargar más contactos'}
          </button>
        </div>
      )}

      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editingContact}
        defaultStatus={defaultStatus}
        onSuccess={fetchContacts}
      />
    </div>
  );
}
