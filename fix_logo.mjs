import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
await db.siteSettings.updateMany({
  data: {
    logoUrl: 'https://drive.google.com/uc?export=view&id=1YkLkl6YCcuum5ewfWqy9A5XNMjg0Rj7K'
  }
})
console.log('OK - URL actualizada')
await db.$disconnect()
