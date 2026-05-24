import dynamicImport from 'next/dynamic';
import ErrorBoundary from '@/components/dashboard/ErrorBoundary';

export const dynamic = 'force-dynamic';

const ClientPortalContent = dynamicImport(
  () => import('@/components/dashboard/ClientPortalContent'),
  { ssr: false }
);

export default function ClientPortalPage() {
  return (
    <ErrorBoundary>
      <ClientPortalContent />
    </ErrorBoundary>
  );
}
