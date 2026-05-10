'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Plus, Search, Trash2, Pencil, Users, UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import ClientForm from '@/components/dashboard/ClientForm';
import { statusColors, statusLabels } from '@/lib/theme-maps';
import type { Client } from '@/lib/types';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function ClientsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [clients,      setClients]      = useState<Client[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen,     setFormOpen]     = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<Client | null>(null);
  const [deleting,      setDeleting]      = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim())           params.set('search', search.trim());
      const res = await fetch(`/api/clients?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch {
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const t = setTimeout(() => fetchClients(), 300);
    return () => clearTimeout(t);
  }, [fetchClients]);

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingClient(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar');
      }
      toast.success('Cliente eliminado');
      setDeleteTarget(null);
      fetchClients();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el cliente');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Clientes</h2>
          <p className="text-white/40 mt-1">Gestiona tu cartera de clientes</p>
        </div>
        <Button onClick={handleCreate} className="bg-brand hover:bg-brand-dark text-white gap-2 self-start">
          <Plus className="w-4 h-4" />Nuevo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder="Buscar por nombre, email o empresa…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full sm:w-[180px] focus-visible:ring-brand">
            <SelectValue placeholder="Filtrar estado" />
          </SelectTrigger>
          <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="prospect">Prospecto</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-white/50">Nombre</TableHead>
              <TableHead className="text-white/50 hidden sm:table-cell">Email</TableHead>
              <TableHead className="text-white/50 hidden md:table-cell">Empresa</TableHead>
              <TableHead className="text-white/50 hidden lg:table-cell">Responsable</TableHead>
              <TableHead className="text-white/50">Estado</TableHead>
              <TableHead className="text-white/50 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-white/[0.04]">
                  <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full shrink-0" /><Skeleton className="h-4 w-28" /></div></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : clients.length === 0 ? (
              <TableRow className="border-white/[0.04]">
                <TableCell colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <Users className="w-12 h-12 text-white/15" />
                    <p className="text-white/40 text-sm">
                      {search || statusFilter !== 'all' ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                    </p>
                    {!search && statusFilter === 'all' && (
                      <Button size="sm" onClick={handleCreate} variant="outline"
                        className="mt-2 border-white/[0.1] text-white/50 hover:text-white hover:bg-white/[0.06] gap-2">
                        <Plus className="w-4 h-4" />Crear cliente
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}
                  className="border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => handleEdit(client)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand/10 text-brand-light text-xs font-medium shrink-0">
                        {initials(client.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white/90">{client.name}</p>
                        <p className="text-xs text-white/40 sm:hidden">{client.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-white/60">{client.email}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-white/60">{client.company || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {client.assignedManager ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[9px] font-medium"
                            style={{ backgroundColor: (client.assignedManager.color || '#7c3aed') + '33', color: client.assignedManager.color || '#7c3aed' }}>
                            {initials(client.assignedManager.name || client.assignedManager.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-white/60">
                          {client.assignedManager.name || client.assignedManager.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-white/25 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" />Sin asignar
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[client.status] || 'status-inactive'}`}>
                      {statusLabels[client.status] || client.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon"
                        className="h-8 w-8 text-white/30 hover:text-white hover:bg-white/[0.06]"
                        onClick={() => handleEdit(client)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                        className="h-8 w-8 text-white/30 hover:text-red-400 hover:bg-red-400/10"
                        onClick={() => setDeleteTarget(client)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ClientForm
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editingClient}
        isAdmin={isAdmin}
        onSuccess={() => { setEditingClient(null); fetchClients(); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#15151c] border-white/[0.06] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/40">
              Esta acción no se puede deshacer. Se eliminará permanentemente{' '}
              <span className="text-white/70 font-medium">{deleteTarget?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.06]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white">
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
