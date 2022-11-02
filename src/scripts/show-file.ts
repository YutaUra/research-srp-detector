import { File, PrismaClient, Repository } from '@prisma/client'

const showFile = (
  file: File & {
    repository: Repository
  },
) => {
  console.log(file.content)
  console.log(`---
name: ${file.name}
path: ${file.path}
repository: ${file.repository.author}/${file.repository.name}
---`)
}

const main = async () => {
  const prisma = new PrismaClient()

  const files = await prisma.file.findMany({
    take: 100,
    include: {
      repository: true,
    },
  })

  for (const file of files) {
    if (file.content.length > 3000) {
      showFile(file)
      return
    }
  }
}

main()
