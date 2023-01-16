import { jsonl } from 'js-jsonl'
import { writeFile } from 'fs/promises'
import { PrismaClient } from '@prisma/client'

type FineTuningData = {
  prompt: string
  completion: string
}

const main = async () => {
  const prisma = new PrismaClient()

  const annotations = await prisma.annotation.findMany({
    include: {
      function: true,
    },
  })
  const text = jsonl.stringify(
    annotations.map<FineTuningData>((v) => ({
      prompt: `
${v.function.content}

上記のコードが SRP に違反している場合は 'YES'、そうでない場合は 'NO' を解答してください。
Answer:`,
      completion: v.isFulfillSRP ? 'YES' : 'NO',
    })),
  )

  await writeFile('data.jsonl', text)
}

main()
