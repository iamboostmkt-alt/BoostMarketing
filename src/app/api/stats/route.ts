import { NextResponse } from 'next/server';
import { rateLimit } from "@/lib/security/rate-limit";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const totalContacts = await db.contact.count({
      where: { userId },
    });

    const totalTasks = await db.task.count({
      where: { userId },
    });

    const completedTasks = await db.task.count({
      where: {
        userId,
        status: 'completed',
      },
    });

    // ✅ FIX: eliminado "active"
    const activeClients = await db.client.count({
      where: { userId },
    });

    const contacts = await db.contact.findMany({
      where: { userId },
      select: { value: true },
    });

    const totalRevenue = contacts.reduce(
      (sum, c) => sum + (c.value ?? 0),
      0
    );

    return NextResponse.json({
      totalContacts,
      totalTasks,
      completedTasks,
      activeClients,
      totalRevenue,
      pendingDeals:
        totalContacts -
        contacts.filter((c) => (c.value ?? 0) > 0).length,
    });

  } catch (error) {
    console.error('Error fetching stats:', error);

    return NextResponse.json({
      totalContacts: 0,
      totalTasks: 0,
      completedTasks: 0,
      activeClients: 0,
      totalRevenue: 0,
      pendingDeals: 0,
    });
  }
}