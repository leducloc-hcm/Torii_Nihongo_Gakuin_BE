import { registerAs } from '@nestjs/config'

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB,
  url: process.env.REDIS_URL,
  tls: process.env.REDIS_TLS === 'true',
  ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
}))
