import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'
import z from 'zod'
config({
  path: '.env',
})
if (!fs.existsSync(path.resolve('.env'))) {
  console.log('Can not find .env')
  process.exit(1)
}
const configSchema = z.object({
  DATABASE_URL: z.string(),
  ACCESS_TOKEN_SECRET: z.string(),
  ACCESS_TOKEN_EXPIRES_IN: z.string(),
  REFRESH_TOKEN_SECRET: z.string(),
  REFRESH_TOKEN_EXPIRES_IN: z.string(),
  SECRET_API_KEY: z.string(),
})

const configServer = configSchema.safeParse(process.env)

if (!configServer.success) {
  console.log('The environment variables are not set correctly in .env')
  console.error(configServer.error)
  process.exit(1)
}

const envConfig = configServer.data

export default envConfig
