import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function getSettings() {
  try {
    return await db.siteSettings.findFirst()
  } catch {
    return null
  }
}

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getSettings()

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Navbar
        agencyName={settings?.agencyName}
        logoUrl={settings?.logoUrl || undefined}
      />
      <main className="flex-1">{children}</main>
      <Footer
        agencyName={settings?.agencyName}
        logoUrl={settings?.logoUrl || undefined}
        email={settings?.email || undefined}
        phone={settings?.phone || undefined}
        instagram={settings?.instagram || undefined}
        facebook={settings?.facebook || undefined}
        tiktok={settings?.tiktok || undefined}
        linkedin={settings?.linkedin || undefined}
        whatsapp={settings?.whatsapp || undefined}
      />
    </div>
  )
}
