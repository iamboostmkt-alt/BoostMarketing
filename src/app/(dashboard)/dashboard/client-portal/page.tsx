import dynamicImport from 'next/dynamic';

export const dynamic = 'force-dynamic';

const ClientPortalContent = dynamicImport(
  () => import('@/components/dashboard/ClientPortalContent'),
  { ssr: false }
);

export default function ClientPortalPage() {
  return <ClientPortalContent />;
}
