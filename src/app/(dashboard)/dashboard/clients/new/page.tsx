'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ClientForm from '@/components/dashboard/ClientForm';

export default function NewClientPage() {
  const router  = useRouter();
  const { data: session } = useSession();
  const role    = session?.user?.role as string | undefined;
  const isAdmin = ['ADMIN', 'PROJECT_MANAGER'].includes(role ?? '');
  const [open, setOpen] = useState(true);

  // Si no tiene permisos, redirigir
  useEffect(() => {
    if (session === null) { router.replace('/dashboard'); }
  }, [session, router]);

  return (
    <ClientForm
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) router.push('/dashboard/clients');
      }}
      client={null}
      isAdmin={isAdmin}
      onSuccess={() => router.push('/dashboard/clients')}
    />
  );
}
