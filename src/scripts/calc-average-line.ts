import { readFile } from 'fs/promises'
import { join } from 'path'
import type { File } from './github-repository-collect'

const main = async () => {
  const files = JSON.parse(
    await readFile(join(process.cwd(), 'files.json'), 'utf8'),
  ) as File[]

  const lines: number[] = []

  for (const file of files) {
    lines.push(
      ...file.content
        .split('\n')
        .map((v) => v.length)
        .filter((v) => v > 0),
    )
  }

  // show average line length
  console.log(
    'Average line length: ' + lines.reduce((a, b) => a + b, 0) / lines.length,
  )

  // show 99th percentile of line length
  lines.sort((a, b) => a - b)
  console.log(
    '99th percentile of line length: ' + lines[Math.floor(lines.length * 0.99)],
  )
}

main()
