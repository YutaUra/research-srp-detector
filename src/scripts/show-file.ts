import { readFile } from 'fs/promises'
import { join } from 'path'
import type { File } from './github-repository-collect'

const showFile = (file: File) => {
  console.log(file.content)
  console.log(`---
name: ${file.name}
path: ${file.path}
repository: ${file.repository.nameWithOwner}
---`)
}

const main = async () => {
  const files = JSON.parse(
    await readFile(join(process.cwd(), 'files.json'), 'utf8'),
  ) as File[]

  for (const file of files) {
    if (file.content.length > 3000) {
      showFile(file)
      return
    }
  }
}

main()
