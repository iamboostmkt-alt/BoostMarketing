import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const [totalContacts, totalTasks, completedTasks, activeClients, contacts] =
      await Promise.all([
        db.contact.count({ where: { userId } }),
        db.task.count({ where: { userId } }),
        db.task.count({ where: { userId, status: 'completed' } }),
        db.client.count({ where: { userId, status: 'active' } }),
        db.contact.findMany({
          where: { userId },
          select: { value: true },
        }),
      ]);

    const totalRevenue = contacts.reduce((sum, c) => sum + c.value, 0);

    return NextResponse.json({
      totalContacts,
      totalTasks,
      completedTasks,
      activeClients,
      totalRevenue,
      pendingDeals: totalContacts - contacts.filter((c) => c.value > 0).length,
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
