import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 1. Clean up existing data
  await prisma.reviewRequest.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.task.deleteMany()
  await prisma.milestone.deleteMany()
  // Let's stick to the existing pattern of cleaning up for deterministic seed in dev.
  await prisma.user.deleteMany()

  // 2. Create Users (Admin Only for Production)
  const passwordHash = await bcrypt.hash('0101', 10)

  const admin = await prisma.user.create({
    data: {
      username: 'Charmy',
      name: 'Charmy',
      passwordHash,
      role: 'ADMIN',
      avatar: '[0_0]',
      themeColor: '#00ff00',
    }
  })

  // 3. Register Fixed Milestones (No milestones for now as requested)
  const milestonesData: any[] = []

  for (const m of milestonesData) {
    await prisma.task.create({
      data: {
        title: m.title,
        status: 'TODO',
        priority: 'HIGH',
        dueDate: new Date(m.end),
        startDate: new Date(m.start),
        isMilestone: true,
        assigneeId: admin.id,
      }
    })
  }

  console.log('Seed database with Admin user only (Milestones removed).')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
