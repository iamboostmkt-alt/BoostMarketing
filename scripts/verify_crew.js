const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const r = await db.appointment.findUnique({
    where: { id: 'cmp4dybfz000ql404pvdsf91q' },
    select: { name: true, email: true }
  });
  console.log(r);
}
main().finally(() => db.$disconnect());