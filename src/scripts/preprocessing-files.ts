import { parse } from '@babel/parser'
import generator from '@babel/generator'
import type { Statement, Expression } from '@babel/types'
import { isExpression } from 'babel-types'
import type { SearchRepositoryFragment } from '../gql/graphql'
import { File, PrismaClient, Repository } from '@prisma/client'

const isClassOrFunctionExpress = (node: Expression): boolean => {
  switch (node.type) {
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
    case 'ClassExpression':
      return true
    case 'AssignmentExpression':
      return isClassOrFunctionExpress(node.right)
    case 'CallExpression':
      return node.arguments
        .filter((v): v is Expression => isExpression(v))
        .some(isClassOrFunctionExpress)
    default:
      return false
  }
}

const isClassOrFunctionStatement = (node: Statement): boolean => {
  switch (node.type) {
    case 'ClassDeclaration':
    case 'FunctionDeclaration':
      return true
    case 'ExpressionStatement':
      return isClassOrFunctionExpress(node.expression)
    case 'VariableDeclaration':
      if (node.declarations.length > 1) return false
      if (!node.declarations[0]?.init) return false
      return isClassOrFunctionExpress(node.declarations[0].init)
    case 'ReturnStatement':
      if (!node.argument) return false
      return isClassOrFunctionExpress(node.argument)
    default:
      return false
  }
}

const isNotMinifiedFile = (file: File): boolean => {
  // calc average line length
  const lines = file.content.split('\n')
  const lineLengths = lines.map((v) => v.length).filter((v) => v > 0)
  const averageLineLength =
    lineLengths.reduce((a, b) => a + b, 0) / lineLengths.length
  return averageLineLength < 120
}

const isNotNodeModules = (file: File): boolean => {
  return !file.path.startsWith('/node_modules')
}

const splitFileByFunction = (
  file: File & {
    repository: Repository
  },
): string[] => {
  try {
    const ast = parse(file.content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy'],
    })

    const header = `/**
 * Repository: ${file.repository.author}/${file.repository.name}
 * Path: ${file.path}
 * File: ${file.name}
 */

`

    return ast.program.body.filter(isClassOrFunctionStatement).map((stmt) => {
      const code = generator(stmt).code

      return `${header}${code}`
    })
  } catch (e) {
    console.error(`Error parsing file: ${makeFilename(file)}. Skipping...`)
    return []
  }
}

const makeFilename = (
  file: File & {
    repository: Repository
  },
): string => {
  return `${file.repository.author}-${file.repository.name}-${file.path.replace(
    /\//g,
    '-',
  )}`
}

export type FunctionCode = {
  repository: SearchRepositoryFragment
  path: string
  name: string
  content: string
  id: string
}

const main = async () => {
  const prisma = new PrismaClient()

  // delete all functions
  await prisma.function.deleteMany()

  const files = await prisma.file.findMany({
    include: {
      repository: true,
    },
  })

  console.log('Files count: ' + files.length)

  // filter minified files
  const nonMinifiedFiles = files
    .filter(isNotMinifiedFile)
    .filter(isNotNodeModules)
  console.log(`Found ${nonMinifiedFiles.length} non-minified files`)

  for (const file of nonMinifiedFiles) {
    const codes = splitFileByFunction(file)
    for (const code of codes) {
      try {
        await prisma.function.create({
          data: {
            content: code,
            fileId: file.id,
          },
        })
      } catch {
        // pass
      }
    }
  }

  const functionsCount = await prisma.function.count()
  const fileCount = await prisma.file.count()

  console.log(`Found ${functionsCount} functions in ${fileCount} files`)
}

main()
