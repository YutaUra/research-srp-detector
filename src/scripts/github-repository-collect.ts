import { GraphQLClient } from 'graphql-request'
import { config } from 'dotenv'
import { gql } from '../gql'
import { exec } from 'child_process'
import { promisify } from 'util'
import { mkdtemp, rm, readFile, writeFile } from 'fs/promises'
import { join, basename } from 'path'
import { tmpdir } from 'os'
import type {
  SearchRepositoryFragment,
  SearchRepositoryResultItemFragment,
} from '../gql/graphql'
import hash from 'node-object-hash'

config()

const execAsync = promisify(exec)

const client = new GraphQLClient('https://api.github.com/graphql', {
  headers: {
    authorization: `token ${process.env['GITHUB_TOKEN']}`,
  },
})

const SEARCH_QUERY = `license:mit "using express" language:TypeScript language:JavaScript size:<5000 stars:>10`

export type File = {
  repository: SearchRepositoryFragment
  path: string
  name: string
  content: string
  id: string
}

const hasher = hash({ sort: true, coerce: true })

const readFiles = async (
  node: SearchRepositoryResultItemFragment | null,
  dir: string,
): Promise<File[]> => {
  if (node?.__typename !== 'Repository') {
    return []
  }
  // Clone the repository; we use the `--depth 1` flag to only clone the latest commit
  const cloneDir = join(dir, node.nameWithOwner)
  await execAsync(`git clone --depth 1 ${node.url} ${cloneDir}`)

  // Search js or ts files
  const { stdout } = await execAsync(
    `find ${cloneDir} -type f -name "*.js" -o -name "*.ts"`,
  )
  const filenames = stdout.split('\n').filter(Boolean)
  console.log(`Found ${filenames.length} files in ${node.nameWithOwner}`)

  // Read the files
  return await Promise.all(
    filenames.map(async (filename) => {
      const content = await readFile(filename, 'utf8')
      const file = {
        repository: node,
        path: filename.replace(cloneDir, ''),
        name: basename(filename),
        content,
      }
      return {
        ...file,
        id: hasher.hash(file),
      }
    }),
  )
}

const main = async () => {
  const res = await client.request(
    gql(/* GraphQL */ `
      query SearchRepositories($query: String!) {
        search(query: $query, type: REPOSITORY, first: 100) {
          nodes {
            ...SearchRepositoryResultItem
          }
        }
      }

      fragment SearchRepository on Repository {
        url
        licenseInfo {
          url
          name
        }
        nameWithOwner
        name
      }

      fragment SearchRepositoryResultItem on SearchResultItem {
        __typename
        ... on Repository {
          ...SearchRepository
        }
      }
    `),
    {
      query: SEARCH_QUERY,
    },
  )

  // create a directory to store the cloned repositories
  const dir = await mkdtemp(join(tmpdir(), 'github-repositories-'))

  console.log(`Cloning repositories to ${dir}`)

  const files = (
    await Promise.all(
      res.search.nodes?.map((node) => readFiles(node, dir)) ?? [],
    )
  ).flatMap((v) => v)

  console.log('Done')
  // remove temp dir
  await rm(dir, { recursive: true })
  console.log(`Removed ${dir} Completely`)

  // write files to a file
  await writeFile(join(process.cwd(), 'files.json'), JSON.stringify(files))

  // Show Summary of number of files and repositories
  const repositoryCount = new Set(files.map((f) => f.repository.nameWithOwner))
  const fileCount = files.length
  console.log(
    `Found ${fileCount} files in ${repositoryCount.size} repositories`,
  )
}

main()
