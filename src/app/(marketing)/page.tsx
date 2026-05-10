import { db } from '@/lib/db'
import Hero from '@/components/landing/Hero'
import Services from '@/components/landing/Services'
import Workflow from '@/components/landing/Workflow'
import Stats from '@/components/landing/Stats'
import PortfolioSection from '@/components/landing/PortfolioSection'
import TestimonialsSection from '@/components/landing/TestimonialsSection'
import TeamSection from '@/components/landing/TeamSection'
import Contact from '@/components/landing/Contact'
import type { PortfolioItem, Testimonial, TeamMember } from '@/lib/types'

async function getCMSData() {
  try {
    const [settings, portfolio, testimonials, team] = await Promise.all([
      db.siteSettings.findFirst(),
      db.portfolioItem.findMany({
        where: { active: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      }),
      db.testimonial.findMany({
        where: { active: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      }),
      db.teamMember.findMany({
        where: { isActive: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      }),
    ])
    return { settings, portfolio, testimonials, team }
  } catch {
    return { settings: null, portfolio: [], testimonials: [], team: [] }
  }
}

export default async function LandingPage() {
  const { settings, portfolio, testimonials, team } = await getCMSData()

  return (
    <>
      <Hero
        title={settings?.heroTitle}
        subtitle={settings?.heroSubtitle}
      />
      <Services />
      <Workflow />
      <Stats />
      <PortfolioSection items={portfolio as unknown as PortfolioItem[]} />
      <TestimonialsSection items={testimonials as unknown as Testimonial[]} />
      <TeamSection members={team as unknown as TeamMember[]} />
      <Contact />
    </>
  )
}
