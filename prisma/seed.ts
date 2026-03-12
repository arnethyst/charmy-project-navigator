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
      themeColor: '#00ccff',
    }
  })

  // 3. Register Fixed Milestones (as Tasks with isMilestone: true)
  const milestonesData = [
    { title: '書類審査〆', date: '2026-05-30' },
    { title: 'アルファ版完成', date: '2026-07-01' },
    { title: '中間審査', date: '2026-07-11' },
    { title: 'ベータ版完成', date: '2026-08-08' },
    { title: '最終審査', date: '2026-08-18' },
    { title: 'TGS2026本番Day1', date: '2026-09-17' },
    { title: 'TGS2026本番Day2', date: '2026-09-18' },
    { title: 'TGS2026本番Day3', date: '2026-09-19' },
    { title: 'TGS2026本番Day4', date: '2026-09-20' },
    { title: 'TGS2026本番Day5', date: '2026-09-21' },
  ]

  for (const m of milestonesData) {
    await prisma.task.create({
      data: {
        title: m.title,
        status: 'TODO',
        priority: 'HIGH',
        dueDate: new Date(m.date),
        startDate: new Date(m.date),
        isMilestone: true,
        assigneeId: admin.id, // Assign to admin by default
      }
    })
  }

  console.log('Seed database with Admin user and fixed milestones.')
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
