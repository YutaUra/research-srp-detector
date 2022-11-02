import { PrismaClient } from '@prisma/client'
import { raw } from '@prisma/client/runtime'
import prompt, { Schema } from 'prompt'

const promptSchema: Schema = {
  properties: {
    isFulfillSRP: {
      description: 'Does this function fulfill SRP?(y/n/skip)',

      type: 'string',
      enum: ['y', 'n', 'skip'],
    },
    stop: {
      description: 'Stop annotation?',
      type: 'boolean',
      default: 'false',
    },
  },
}

type Properties = {
  isFulfillSRP: 'y' | 'n' | 'skip'
  stop: boolean
}

const main = async () => {
  const prisma = new PrismaClient()

  // count annotated functions
  const functionCount = await prisma.function.count()
  let annotatedFunctionCount = await prisma.annotation.count()
  let fulfilledFunctionCount = await prisma.annotation.count({
    where: { isFulfillSRP: true },
  })

  // add annotation
  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log(
      `\n\n\nFulfilled / annotated / total: ${fulfilledFunctionCount} / ${annotatedFunctionCount} / ${functionCount}`,
    )

    const f = await prisma.function.findFirst({
      where: {
        annotation: null,
      },
      skip: Math.floor(
        Math.random() * (functionCount - annotatedFunctionCount),
      ),
    })
    if (!f) {
      console.log('No more functions to annotate')
      break
    }
    console.log('----------------------------------------')
    console.log(f.content)
    console.log('----------------------------------------')
    prompt.start()
    const { isFulfillSRP, stop } = (await prompt.get(
      promptSchema,
    )) as Properties

    if (isFulfillSRP === 'skip') {
      if (stop) {
        break
      }
      continue
    }

    annotatedFunctionCount++
    if (isFulfillSRP === 'y') {
      fulfilledFunctionCount++
    }

    await prisma.annotation.create({
      data: {
        isFulfillSRP: isFulfillSRP === 'y',
        functionId: f.id,
      },
    })

    if (stop) {
      break
    }
  }
}

main()
