import { Configuration, OpenAIApi } from 'openai'
import { config } from 'dotenv'
import axios from 'axios'

config()

const main = async () => {
  const configuration = new Configuration({
    apiKey: process.env['OPENAI_API_KEY'],
  })
  const openai = new OpenAIApi(configuration)

  try {
    const response = await openai.createFineTune({
      training_file: process.env['FILE_ID_1']!,
      model: 'davinci',
    })

    console.log(response.status, response.statusText)
    console.log(response.data)
  } catch (e) {
    if (!axios.isAxiosError(e)) {
      throw e
    }
    console.log(e.response?.status, e.response?.statusText)
    console.log(e.response?.data)
  }
}

main()
