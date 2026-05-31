const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const r = await db.appointment.findMany({
    where: { email: { contains: 'internal' } },
    select: { id: true, name: true, email: true },
    take: 10
  });
  console.log('Internal appointments:', JSON.stringify(r, null, 2));
  const all = await db.appointment.findMany({
    select: { id: true, name: true, email: true },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Recent appointments:', JSON.stringify(all, null, 2));
}
main().finally(() => db.$disconnect());