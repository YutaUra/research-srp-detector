import { Configuration, OpenAIApi } from 'openai'
import { config } from 'dotenv'
import { createReadStream } from 'fs'

config()

const main = async () => {
  const configuration = new Configuration({
    apiKey: process.env['OPENAI_API_KEY'],
  })
  const openai = new OpenAIApi(configuration)

  const response = await openai.createFile(
    createReadStream('data.jsonl'),
    'fine-tune',
  )
  console.log(response.status, response.statusText)
  console.log(response.data)
}

main()
