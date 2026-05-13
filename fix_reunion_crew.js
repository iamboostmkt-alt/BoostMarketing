const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const r = await db.appointment.update({
    where: { id: 'cmp4dybfz000ql404pvdsf91q' },
    data: { email: 'internal@internal.boost' }
  });
  console.log('Updated:', r.name, r.email);
}
main().finally(() => db.$disconnect());