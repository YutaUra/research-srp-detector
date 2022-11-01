import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { File } from './github-repository-collect'
import { parse } from '@babel/parser'
import traverse, { NodePath } from '@babel/traverse'
import generator from '@babel/generator'
import type { Statement, Expression, Node } from '@babel/types'
import { isExpression } from 'babel-types'
import type { SearchRepositoryFragment } from '../gql/graphql'
import hash from 'node-object-hash'

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

const removeSiblingFunctions = (path: NodePath<Node>): Node => {
  const siblings = path.getAllNextSiblings().concat(path.getAllPrevSiblings())
  siblings.forEach((v) => {
    // if (v.isStatement() && isClassOrFunctionStatement(v.node)) {
    v.remove()
    // }
  })
  if (!path.parentPath) {
    return path.node
  }
  return removeSiblingFunctions(path.parentPath)
}

const splitFileByFunction = (
  file: Pick<File, 'content' | 'repository' | 'path'>,
): string[] => {
  try {
    const ast = parse(file.content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy'],
    })
    let key = ''
    const functionKeys: string[] = []

    traverse(ast, {
      Statement(path) {
        if (isClassOrFunctionStatement(path.node)) {
          functionKeys.push(key)
        }
      },
      enter(path) {
        key += `/${path.type}[${path.key}]`
      },
      exit() {
        key = key.slice(0, key.lastIndexOf('/'))
      },
    })

    return functionKeys.map((functionKey) => {
      let key2 = ''
      const ast = parse(file.content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
      })

      traverse(ast, {
        enter(path) {
          key2 += `/${path.type}[${path.key}]`

          if (key2 === functionKey) {
            removeSiblingFunctions(path)
          }
        },
        exit() {
          key2 = key2.slice(0, key2.lastIndexOf('/'))
        },
      })

      const { code } = generator(ast)
      return code
    })
  } catch (e) {
    console.error(`Error parsing file: ${makeFilename(file)}. Skipping...`)
    return []
  }
}

const makeFilename = (file: Pick<File, 'repository' | 'path'>): string => {
  return `${file.repository.nameWithOwner.replace(
    /\//g,
    '-',
  )}-${file.path.replace(/\//g, '-')}`
}

export type FunctionCode = {
  repository: SearchRepositoryFragment
  path: string
  name: string
  content: string
  id: string
}

const main = async () => {
  const files = JSON.parse(
    await readFile(join(process.cwd(), 'files.json'), 'utf8'),
  ) as File[]

  console.log('Files count: ' + files.length)

  // filter minified files
  const nonMinifiedFiles = files
    .filter(isNotMinifiedFile)
    .filter(isNotNodeModules)
  console.log(`Found ${nonMinifiedFiles.length} non-minified files`)

  for (const file of nonMinifiedFiles) {
    const content = `/**
* File: ${file.name}
* Path: ${file.path}
* Repository: ${file.repository.nameWithOwner}
*/

${file.content}`
    // create file name with repository name and path
    const fileName = makeFilename(file)

    await writeFile(join(process.cwd(), 'tmp', fileName), content)
  }

  // split files into function definitions
  const hasher = hash({ sort: true, coerce: true })
  const functions = nonMinifiedFiles.flatMap(({ id: _, ...file }) => {
    const functionCodes = splitFileByFunction(file)
    return functionCodes.map((content) => {
      const code: Omit<FunctionCode, 'id'> = {
        repository: file.repository,
        path: file.path,
        name: file.name,
        content,
      }

      return {
        ...code,
        id: hasher.hash(code),
      }
    })
  })

  await writeFile(join(process.cwd(), 'functions.json'), JSON.stringify(files))

  // Show Summary of number of functions and files
  const fileCount = new Set(
    functions.map((f) => `${f.repository.nameWithOwner}/${f.path}`),
  )
  const functionsCount = functions.length
  console.log(`Found ${functionsCount} functions in ${fileCount.size} files`)
}

main()
