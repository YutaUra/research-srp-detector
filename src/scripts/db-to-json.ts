import { PrismaClient } from '@prisma/client'
import { writeFile } from 'fs/promises'

const main = async () => {
  const prisma = new PrismaClient()

  const functions = await prisma.file.findMany({
    include: {
      repository: true,
    },
  })

  await writeFile('db.json', JSON.stringify(functions, null, 2))
}

main()
