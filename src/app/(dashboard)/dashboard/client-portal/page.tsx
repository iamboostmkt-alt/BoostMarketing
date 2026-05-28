'use client';
import dynamicImport from 'next/dynamic';
import ErrorBoundary from '@/components/dashboard/ErrorBoundary';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const ClientPortalContent = dynamicImport(
  () => import('@/components/dashboard/ClientPortalContent'),
  { ssr: false }
);

function ClientPortalInner() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId') ?? 'default';
  return (
    <ErrorBoundary>
      <ClientPortalContent key={clientId} />
    </ErrorBoundary>
  );
}

export default function ClientPortalPage() {
  return (
    <Suspense fallback={null}>
      <ClientPortalInner />
    </Suspense>
  );
}
